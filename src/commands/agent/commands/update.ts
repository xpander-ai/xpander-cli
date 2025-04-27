import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { CommandType } from '../../../types';
import { createClient } from '../../../utils/client';
import { colorizeStatus } from '../helpers/format';

/**
 * Register update command
 */
export function registerUpdateCommand(agentCmd: Command): void {
  // Update an agent
  agentCmd
    .command(CommandType.Update)
    .description('Update an agent')
    .requiredOption('--id <agent_id>', 'ID of the agent to update')
    .option('--name <name>', 'New name for the agent')
    .option('--role <role>', 'New role for the agent')
    .option('--goal <goal>', 'New goal for the agent')
    .option('--instructions <instructions>', 'New instructions for the agent')
    .option('--icon <icon>', 'New icon for the agent')
    .option('--profile <name>', 'Profile to use')
    .option('--json', 'Output result in JSON format')
    .action(async (options) => {
      try {
        let agentId = options.id;

        // Create a spinner for better visual feedback
        const spinner = process.stdout.isTTY
          ? ora({
              text: chalk.blue(`Fetching agent details...`),
              spinner: 'dots',
            }).start()
          : { succeed: console.log, fail: console.error, stop: () => {} };

        const client = createClient(options.profile);
        const existingAgent = await client.getAgent(agentId);

        spinner.stop();

        if (!existingAgent) {
          console.log(
            '\n' + chalk.yellow(`⚠️ Agent with ID ${agentId} not found.`),
          );
          return;
        }

        // Show current agent details
        console.log('\n');
        console.log(chalk.bold.blue('🤖 Current Agent Details'));
        console.log(chalk.dim('─'.repeat(50)));

        console.log(chalk.bold('Name:     ') + chalk.cyan(existingAgent.name));
        console.log(chalk.bold('ID:       ') + chalk.dim(existingAgent.id));
        console.log(
          chalk.bold('Status:   ') + colorizeStatus(existingAgent.status),
        );
        console.log(chalk.bold('Type:     ') + chalk.white(existingAgent.type));
        console.log(
          chalk.bold('Model:    ') +
            chalk.yellow(
              `${existingAgent.model_provider}/${existingAgent.model_name}`,
            ),
        );

        if ('icon' in existingAgent && existingAgent.icon) {
          console.log(chalk.bold('Icon:     ') + existingAgent.icon);
        }

        if (existingAgent.description) {
          console.log(chalk.bold('Description: ') + existingAgent.description);
        }

        // Show instructions if available
        if (
          existingAgent.instructions &&
          (existingAgent.instructions.role ||
            existingAgent.instructions.goal ||
            existingAgent.instructions.general)
        ) {
          console.log('\n' + chalk.bold('Current Instructions:'));

          if (existingAgent.instructions.role) {
            console.log(
              chalk.bold('• Role:    ') + existingAgent.instructions.role,
            );
          }

          if (existingAgent.instructions.goal) {
            console.log(
              chalk.bold('• Goal:    ') + existingAgent.instructions.goal,
            );
          }

          if (existingAgent.instructions.general) {
            console.log(
              chalk.bold('• General: ') + existingAgent.instructions.general,
            );
          }
        }

        console.log(chalk.dim('─'.repeat(50)));
        console.log('\n');

        // Ask how to edit instructions
        console.log(chalk.bold.blue('🪄 Update Agent Details'));
        console.log(chalk.dim('─'.repeat(50)));

        const editMethod = await inquirer.prompt([
          {
            type: 'list',
            name: 'method',
            message: 'How would you like to edit the agent details?',
            choices: [
              { name: 'Inline (field by field)', value: 'inline' },
              {
                name: 'Text editor (all fields at once)',
                value: 'editor',
              },
            ],
          },
        ]);

        let updateData: {
          icon?: string;
          instructions?: { role?: string; goal?: string; general?: string };
        } = {};

        if (editMethod.method === 'inline') {
          // Inline editing
          const details = await inquirer.prompt([
            {
              type: 'input',
              name: 'icon',
              message: 'Choose an icon for your agent:',
              default: existingAgent.icon || '🤖',
            },
            {
              type: 'input',
              name: 'roleInstructions',
              message: 'What role should your agent perform?',
              default: existingAgent.instructions?.role || '',
            },
            {
              type: 'input',
              name: 'goalInstructions',
              message: 'What is the main goal of your agent?',
              default: existingAgent.instructions?.goal || '',
            },
            {
              type: 'input',
              name: 'generalInstructions',
              message: 'Any additional instructions for your agent?',
              default: existingAgent.instructions?.general || '',
            },
          ]);

          updateData = {
            icon: details.icon,
            instructions: {
              role: details.roleInstructions || undefined,
              goal: details.goalInstructions || undefined,
              general: details.generalInstructions || undefined,
            },
          };
        } else {
          // Editor mode
          // Get current instructions to pre-fill the editor
          const currentInstructions = {
            icon: existingAgent.icon || '🤖',
            instructions: {
              role: existingAgent.instructions?.role || '',
              goal: existingAgent.instructions?.goal || '',
              general: existingAgent.instructions?.general || '',
            },
          };

          console.log(chalk.blue('Opening your text editor...'));
          console.log(
            chalk.dim('Current settings will be pre-loaded in the editor'),
          );

          const editorContent = await inquirer.prompt([
            {
              type: 'editor',
              name: 'content',
              message: 'Edit agent details in your default text editor:',
              default: JSON.stringify(currentInstructions, null, 2),
              postfix: '.json',
            },
          ]);

          try {
            // Create a spinner for better visual feedback during parsing
            const parsingSpinner = process.stdout.isTTY
              ? ora({
                  text: chalk.blue('Processing editor content...'),
                  spinner: 'dots',
                }).start()
              : { succeed: console.log, fail: console.error, stop: () => {} };

            // Parse the JSON from the editor
            const editorData = JSON.parse(editorContent.content);
            parsingSpinner.succeed(
              chalk.green('Successfully parsed JSON content'),
            );

            // Ensure the structure matches what the API expects
            updateData = {
              icon: editorData.icon,
            };

            // Only add instructions if they exist
            if (editorData.instructions) {
              updateData.instructions = {};

              // Only add each field if it has a value
              if (editorData.instructions.role) {
                updateData.instructions.role = editorData.instructions.role;
              }

              if (editorData.instructions.goal) {
                updateData.instructions.goal = editorData.instructions.goal;
              }

              if (editorData.instructions.general) {
                updateData.instructions.general =
                  editorData.instructions.general;
              }
            }
          } catch (error) {
            console.error(chalk.red('\n❌ Error parsing JSON from editor:'));
            console.error(chalk.red('Please make sure the JSON is valid.'));
            return;
          }
        }

        // Only include instructions if at least one field is filled
        if (
          !updateData.instructions?.role &&
          !updateData.instructions?.goal &&
          !updateData.instructions?.general
        ) {
          updateData.instructions = undefined;
        }

        // Update the agent
        const updateSpinner = process.stdout.isTTY
          ? ora({
              text: chalk.blue('Updating agent...'),
              spinner: 'dots',
            }).start()
          : { succeed: console.log, fail: console.error, stop: () => {} };

        const updatedAgent = await client.updateAgent(agentId, updateData);

        if (updatedAgent) {
          updateSpinner.succeed(chalk.green('Agent updated successfully!'));

          // Ask about deployment
          console.log('\n');
          const deployAnswer = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'deploy',
              message: 'Would you like to deploy the updated agent?',
              default: true,
            },
          ]);

          if (deployAnswer.deploy) {
            const deploySpinner = process.stdout.isTTY
              ? ora({
                  text: chalk.blue('Deploying updated agent...'),
                  spinner: 'dots',
                }).start()
              : { succeed: console.log, fail: console.error, stop: () => {} };

            try {
              await client.deployAgent(updatedAgent.id);
              deploySpinner.succeed(
                chalk.green('Agent deployed successfully!'),
              );
            } catch (deployError) {
              deploySpinner.fail(chalk.red('Failed to deploy agent'));
              console.error(
                chalk.red('The agent was updated but could not be deployed.'),
              );
              if (deployError instanceof Error) {
                console.error(chalk.red(deployError.message));
              }
            }
          }

          // Display final agent details
          console.log('\n');
          console.log(chalk.bold.blue('🚀 Updated Agent Details'));
          console.log(chalk.dim('─'.repeat(50)));

          // Display final agent details in a cleaner format
          console.log(chalk.bold('Name:     ') + chalk.cyan(updatedAgent.name));
          console.log(chalk.bold('ID:       ') + chalk.dim(updatedAgent.id));
          console.log(
            chalk.bold('Status:   ') + colorizeStatus(updatedAgent.status),
          );
          console.log(
            chalk.bold('Type:     ') + chalk.white(updatedAgent.type),
          );
          console.log(
            chalk.bold('Model:    ') +
              chalk.yellow(
                `${updatedAgent.model_provider}/${updatedAgent.model_name}`,
              ),
          );

          if ('icon' in updatedAgent && updatedAgent.icon) {
            console.log(chalk.bold('Icon:     ') + updatedAgent.icon);
          }

          if (updatedAgent.description) {
            console.log(chalk.bold('Description: ') + updatedAgent.description);
          }

          // Show instructions if available in a cleaner format
          if (
            updatedAgent.instructions &&
            (updatedAgent.instructions.role ||
              updatedAgent.instructions.goal ||
              updatedAgent.instructions.general)
          ) {
            console.log('\n' + chalk.bold('Instructions:'));

            if (updatedAgent.instructions.role) {
              console.log(
                chalk.bold('• Role:    ') + updatedAgent.instructions.role,
              );
            }

            if (updatedAgent.instructions.goal) {
              console.log(
                chalk.bold('• Goal:    ') + updatedAgent.instructions.goal,
              );
            }

            if (updatedAgent.instructions.general) {
              console.log(
                chalk.bold('• General: ') + updatedAgent.instructions.general,
              );
            }
          }

          console.log(chalk.dim('─'.repeat(50)));
          console.log(chalk.green.bold('\n✅ Agent update complete!\n'));
        } else {
          updateSpinner.fail(chalk.red('Failed to update agent'));
          console.error(
            chalk.red('Please check the logs above for more details.'),
          );
        }
      } catch (error: any) {
        if (error.status === 403) {
          console.error(
            chalk.red(
              'Authorization error: You lack permission for this action.',
            ),
          );
          console.error(
            chalk.yellow('Check your API key with "xpander profile --verify"'),
          );
        } else if (error.status === 404) {
          console.error(chalk.red(`Agent with ID "${options.id}" not found.`));
        } else {
          console.error(
            chalk.red('Error updating agent:'),
            error.message || String(error),
          );
        }
      }
    });
}
