import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { createClient, XpanderClient } from '../utils/client';
import { getOrganizationId, getApiKey } from '../utils/config';
import { formatOutput } from '../utils/formatter';

/**
 * Configure agent-related commands
 */
export function agent(program: Command): void {
  const agentCommand = program.command('agent').description('Manage agents');

  // List agents
  agentCommand
    .command('list')
    .description('List all agents')
    .option('--output <format>', 'Output format (json, table)')
    .option(
      '--filter-id <id>',
      'Filter agents by ID (supports partial matches)',
    )
    .action(async (cmdOptions) => {
      try {
        const client = createClient();

        // Instead of using client.get directly, use the getAgents method from XpanderClient
        const agents = await client.getAgents();

        if (agents.length === 0) {
          console.log(chalk.yellow('No agents found.'));
          return;
        }

        // Filter agents by ID if filter-id option is provided
        let filteredAgents = agents;
        if (cmdOptions.filterId) {
          filteredAgents = agents.filter((agentItem) =>
            agentItem.id
              .toLowerCase()
              .includes(cmdOptions.filterId.toLowerCase()),
          );

          if (filteredAgents.length === 0) {
            console.log(
              chalk.yellow(
                `No agents found with ID matching "${cmdOptions.filterId}"`,
              ),
            );
            return;
          }
        }

        // Prepare agents data with formatted fields for better display
        const formattedAgents = filteredAgents.map((agentItem) => {
          // Format the date properly
          let createdDate = '';
          try {
            createdDate = new Date(agentItem.created_at).toLocaleDateString();
          } catch (e) {
            // If date parsing fails, use the raw value
            createdDate = agentItem.created_at || '';
          }

          // Process data for better table display
          return {
            id: agentItem.id, // Show full ID as requested
            name: agentItem.name,
            model: agentItem.model_name || '',
            tools_count: agentItem.tools ? agentItem.tools.length : 0,
            created_at: createdDate,
          };
        });

        if (cmdOptions.output === 'json') {
          // For JSON output, return all raw data without filtering
          console.log(JSON.stringify(filteredAgents, null, 2));
        } else {
          // For table output, use the formatted data with specific columns
          formatOutput(formattedAgents, {
            title:
              filteredAgents.length === 1 ? 'Agent Details' : 'Your Agents',
            columns: ['id', 'name', 'model', 'tools_count', 'created_at'],
            headers: ['ID', 'Name', 'Model', 'Tools', 'Created'],
          });
        }
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
      }
    });

  // Add a dedicated command for JSON output that returns raw data
  agentCommand
    .command('list-json')
    .description('List all agents in raw JSON format')
    .option(
      '--filter-id <id>',
      'Filter agents by ID (supports partial matches)',
    )
    .action(async (cmdOptions) => {
      try {
        const client = createClient();
        const agents = await client.getAgents();

        if (agents.length === 0) {
          console.log(JSON.stringify([]));
          return;
        }

        // Filter agents by ID if filter-id option is provided
        let filteredAgents = agents;
        if (cmdOptions.filterId) {
          filteredAgents = agents.filter((agentItem) =>
            agentItem.id
              .toLowerCase()
              .includes(cmdOptions.filterId.toLowerCase()),
          );

          if (filteredAgents.length === 0) {
            console.log(JSON.stringify([]));
            return;
          }
        }

        // Output raw JSON data without any formatting or filtering
        console.log(JSON.stringify(filteredAgents, null, 2));
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
      }
    });

  // Get agent details
  agentCommand
    .command('get')
    .description('Get details about an agent')
    .option('--id <id>', 'Agent ID')
    .option('--output <format>', 'Output format (json, table)')
    .action(async (options) => {
      try {
        // Get the organization ID
        const orgId = getOrganizationId();
        if (!orgId) {
          console.error(
            chalk.red(
              'Organization ID not set. Run "xpander configure --org YOUR_ORG_ID" first.',
            ),
          );
          return;
        }

        let agentId = options.id;

        // If no ID provided, prompt user to select from available agents
        if (!agentId) {
          console.log(
            chalk.blue(`Fetching agents for organization ID: ${orgId}`),
          );

          const client = createClient();
          // Instead of using client.get directly, use the getAgents method from XpanderClient
          const agents = await client.getAgents();

          if (agents.length === 0) {
            console.log(chalk.yellow('No agents found.'));
            return;
          }

          const choices = agents.map((agentItem) => ({
            name: `${agentItem.name} (${agentItem.id})`,
            value: agentItem.id,
          }));

          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'agentId',
              message: 'Select an agent:',
              choices,
            },
          ]);

          agentId = answers.agentId;
        }

        console.log(chalk.blue(`Fetching details for agent: ${agentId}`));

        const client = createClient();
        // Instead of using client.get directly, use the getAgent method from XpanderClient
        const agentData = await client.getAgent(agentId);

        if (!agentData) {
          console.log(chalk.yellow(`Agent with ID ${agentId} not found.`));
          return;
        }

        // Check if JSON output is requested
        if (options.output === 'json') {
          console.log(JSON.stringify(agentData, null, 2));
          return;
        }

        // For table output, show a more human-readable format
        // Display the agent details in a structured way
        console.log(chalk.bold('\nAgent Details:'));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`${chalk.bold('Name:')}        ${agentData.name}`);
        console.log(`${chalk.bold('ID:')}          ${agentData.id}`);
        console.log(`${chalk.bold('Status:')}      ${agentData.status}`);
        console.log(`${chalk.bold('Type:')}        ${agentData.type}`);
        console.log(
          `${chalk.bold('Model:')}       ${agentData.model_provider} / ${agentData.model_name}`,
        );
        console.log(`${chalk.bold('Version:')}     ${agentData.version}`);
        console.log(
          `${chalk.bold('Tools:')}       ${agentData.tools?.length || 0}`,
        );

        if ('icon' in agentData && agentData.icon) {
          console.log(`${chalk.bold('Icon:')}        ${agentData.icon}`);
        }
        if (agentData.description) {
          console.log(`${chalk.bold('Description:')} ${agentData.description}`);
        }
        if (agentData.created_at) {
          let createdDate = '';
          try {
            createdDate = new Date(agentData.created_at).toLocaleDateString();
          } catch (e) {
            createdDate = agentData.created_at;
          }
          console.log(`${chalk.bold('Created:')}     ${createdDate}`);
        }

        // Show instructions if available
        if (agentData.instructions) {
          console.log(`\n${chalk.bold('Instructions:')}`);
          if (agentData.instructions.role) {
            console.log(
              `${chalk.bold('Role:')}     ${agentData.instructions.role}`,
            );
          }
          if (agentData.instructions.goal) {
            console.log(
              `${chalk.bold('Goal:')}     ${agentData.instructions.goal}`,
            );
          }
          if (agentData.instructions.general) {
            console.log(
              `${chalk.bold('General:')}  ${agentData.instructions.general}`,
            );
          }
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
      }
    });

  // Create a new agent
  agentCommand
    .command('new')
    .description('Create a new agent')
    .option('--name <name>', 'Name of the agent')
    .option('--profile <profile>', 'Profile to use')
    .option('--skip-details', 'Skip prompting for additional details')
    .action(async (options) => {
      try {
        let { name, profile, skipDetails } = options as {
          name?: string;
          profile?: string;
          skipDetails?: boolean;
        };

        const apiKey = getApiKey(profile);
        if (!apiKey) {
          console.error(
            chalk.red(
              'No API key found. Please run `xpander configure` first.',
            ),
          );
          process.exit(1);
        }

        // If no name provided, prompt for it
        if (!name) {
          // Create a more appealing welcome screen
          console.log('\n');
          console.log(chalk.bold.blue('✨ Agent Creation Wizard ✨'));
          console.log(chalk.dim('─'.repeat(50)));
          console.log(
            chalk.yellow('Create a powerful AI agent for your organization'),
          );
          console.log(chalk.dim('─'.repeat(50)));
          console.log('\n');

          const nameAnswer = await inquirer.prompt([
            {
              type: 'input',
              name: 'agentName',
              message: 'What name would you like for your agent?',
              validate: (input) => {
                if (!input.trim()) return 'Name is required';
                return true;
              },
            },
          ]);

          name = nameAnswer.agentName;

          // Since we're in interactive mode, ensure we collect all details
          skipDetails = false;
        }

        // At this point, name should always be defined
        if (!name) {
          throw new Error('Agent name is required');
        }

        // Create a spinner for better visual feedback
        const spinner = process.stdout.isTTY
          ? ora({
              text: chalk.blue(`Creating agent "${name}"...`),
              spinner: 'dots',
            }).start()
          : { succeed: console.log, fail: console.error, stop: () => {} };

        const client = new XpanderClient(apiKey, undefined, profile);
        let createdAgent = await client.createAgent(name);

        // Update spinner on success
        spinner.succeed(chalk.green(`Agent "${name}" created successfully!`));
        console.log('\n');

        // If not skipping details, prompt for additional information
        if (!skipDetails) {
          const updateAnswers = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'wantToUpdate',
              message: 'Would you like to personalize your agent?',
              default: true,
            },
          ]);

          if (updateAnswers.wantToUpdate) {
            console.log(chalk.dim('─'.repeat(50)));
            console.log(chalk.blue.bold('🪄 Personalizing Your Agent'));
            console.log(chalk.dim('─'.repeat(50)));

            const details = await inquirer.prompt([
              {
                type: 'input',
                name: 'icon',
                message: 'Choose an icon for your agent:',
                default: '🤖',
              },
              {
                type: 'input',
                name: 'roleInstructions',
                message: 'What role should your agent perform?',
                default: '',
              },
              {
                type: 'input',
                name: 'goalInstructions',
                message: 'What is the main goal of your agent?',
                default: '',
              },
              {
                type: 'input',
                name: 'generalInstructions',
                message: 'Any additional instructions for your agent?',
                default: '',
              },
            ]);

            // Update the agent with additional details
            const updateSpinner = process.stdout.isTTY
              ? ora({
                  text: chalk.blue('Applying personalization...'),
                  spinner: 'dots',
                }).start()
              : { succeed: console.log, fail: console.error, stop: () => {} };

            const updateData: {
              icon?: string;
              instructions?: { role?: string; goal?: string; general?: string };
            } = {
              icon: details.icon,
              instructions: {
                role: details.roleInstructions || undefined,
                goal: details.goalInstructions || undefined,
                general: details.generalInstructions || undefined,
              },
            };

            // Only include instructions if at least one field is filled
            if (
              !details.roleInstructions &&
              !details.goalInstructions &&
              !details.generalInstructions
            ) {
              updateData.instructions = undefined;
            }

            const updatedAgent = await client.updateAgent(
              createdAgent.id,
              updateData,
            );

            if (updatedAgent) {
              createdAgent = updatedAgent;
              updateSpinner.succeed(chalk.green('Personalization complete!'));
            } else {
              updateSpinner.fail(
                chalk.yellow(
                  'Could not apply personalization, but agent was created.',
                ),
              );
            }
          }
        }

        // Deploy the agent
        const deploySpinner = process.stdout.isTTY
          ? ora({
              text: chalk.blue('Deploying your agent...'),
              spinner: 'dots',
            }).start()
          : { succeed: console.log, fail: console.error, stop: () => {} };

        await client.deployAgent(createdAgent.id);
        deploySpinner.succeed(chalk.green('Agent deployed successfully!'));

        console.log('\n');
        console.log(chalk.bold.blue('🚀 Your Agent is Ready!'));
        console.log(chalk.dim('─'.repeat(50)));

        // Display final agent details in a cleaner format
        console.log(chalk.bold('Name:     ') + chalk.cyan(createdAgent.name));

        console.log(chalk.bold('ID:       ') + chalk.dim(createdAgent.id));

        if ('icon' in createdAgent && createdAgent.icon) {
          console.log(chalk.bold('Icon:     ') + createdAgent.icon);
        }

        console.log(
          chalk.bold('Model:    ') +
            chalk.yellow(
              `${createdAgent.model_provider}/${createdAgent.model_name}`,
            ),
        );

        // Show instructions if available in a cleaner format
        if (
          createdAgent.instructions &&
          (createdAgent.instructions.role ||
            createdAgent.instructions.goal ||
            createdAgent.instructions.general)
        ) {
          console.log('\n' + chalk.bold('Instructions:'));

          if (createdAgent.instructions.role) {
            console.log(
              chalk.bold('• Role:    ') + createdAgent.instructions.role,
            );
          }

          if (createdAgent.instructions.goal) {
            console.log(
              chalk.bold('• Goal:    ') + createdAgent.instructions.goal,
            );
          }

          if (createdAgent.instructions.general) {
            console.log(
              chalk.bold('• General: ') + createdAgent.instructions.general,
            );
          }
        }

        console.log(chalk.dim('─'.repeat(50)));
        console.log(chalk.green.bold('\n✅ Agent creation complete!\n'));
      } catch (error) {
        console.error(chalk.red('\n❌ Error creating agent:'));
        if (error instanceof Error) {
          console.error(chalk.red(error.message));
        } else {
          console.error(chalk.red('An unknown error occurred'));
        }
        process.exit(1);
      }
    });

  // Delete an agent
  agentCommand
    .command('delete')
    .description('Delete an agent')
    .option('--id <id>', 'Agent ID')
    .action(async (options) => {
      try {
        let agentId = options.id;

        // If no ID provided, prompt user to select from available agents
        if (!agentId) {
          const client = createClient();
          // Instead of using client.get directly, use the getAgents method from XpanderClient
          const agents = await client.getAgents();

          if (agents.length === 0) {
            console.log(chalk.yellow('No agents found.'));
            return;
          }

          const choices = agents.map((agentItem) => ({
            name: `${agentItem.name} (${agentItem.id})`,
            value: agentItem.id,
          }));

          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'agentId',
              message: 'Select an agent to delete:',
              choices,
            },
          ]);

          agentId = answers.agentId;
        }

        // Confirm deletion
        const confirmation = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: `Are you sure you want to delete agent ${agentId}?`,
            default: false,
          },
        ]);

        if (!confirmation.confirmed) {
          console.log(chalk.blue('Operation cancelled.'));
          return;
        }

        console.log(chalk.blue(`Deleting agent: ${agentId}`));

        const client = createClient();
        // Instead of deleting with an API call, use the deleteAgent method from XpanderClient
        const success = await client.deleteAgent(agentId);

        if (success) {
          console.log(chalk.green(`Agent ${agentId} deleted successfully!`));
        } else {
          console.log(
            chalk.yellow(
              `Could not delete agent ${agentId}. Please try again.`,
            ),
          );
        }
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
      }
    });

  // Update an agent
  agentCommand
    .command('update')
    .description('Update an agent')
    .option('--id <id>', 'Agent ID')
    .action(async (options) => {
      try {
        let agentId = options.id;

        // If no ID provided, prompt user to select from available agents
        if (!agentId) {
          const client = createClient();
          const agents = await client.getAgents();

          if (agents.length === 0) {
            console.log(chalk.yellow('No agents found.'));
            return;
          }

          const choices = agents.map((agentItem) => ({
            name: `${agentItem.name} (${agentItem.id})`,
            value: agentItem.id,
          }));

          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'agentId',
              message: 'Select an agent to update:',
              choices,
            },
          ]);

          agentId = answers.agentId;
        }

        console.log(chalk.blue(`Fetching agent with ID: ${agentId}`));
        const client = createClient();
        const existingAgent = await client.getAgent(agentId);

        if (!existingAgent) {
          console.log(chalk.yellow(`Agent with ID ${agentId} not found.`));
          return;
        }

        // Show current agent details
        console.log(chalk.bold('\nCurrent Agent Details:'));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`${chalk.bold('Name:')}        ${existingAgent.name}`);
        console.log(`${chalk.bold('ID:')}          ${existingAgent.id}`);
        console.log(`${chalk.bold('Status:')}      ${existingAgent.status}`);
        console.log(`${chalk.bold('Type:')}        ${existingAgent.type}`);
        console.log(
          `${chalk.bold('Model:')}       ${existingAgent.model_provider} / ${existingAgent.model_name}`,
        );
        if ('icon' in existingAgent && existingAgent.icon) {
          console.log(`${chalk.bold('Icon:')}        ${existingAgent.icon}`);
        }
        if (existingAgent.description) {
          console.log(
            `${chalk.bold('Description:')} ${existingAgent.description}`,
          );
        }
        if (existingAgent.instructions) {
          console.log(`\n${chalk.bold('Current Instructions:')}`);
          if (existingAgent.instructions.role) {
            console.log(
              `${chalk.bold('Role:')}     ${existingAgent.instructions.role}`,
            );
          }
          if (existingAgent.instructions.goal) {
            console.log(
              `${chalk.bold('Goal:')}     ${existingAgent.instructions.goal}`,
            );
          }
          if (existingAgent.instructions.general) {
            console.log(
              `${chalk.bold('General:')}  ${existingAgent.instructions.general}`,
            );
          }
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Ask how to edit instructions
        const editMethod = await inquirer.prompt([
          {
            type: 'list',
            name: 'method',
            message: 'How would you like to edit the instructions?',
            choices: [
              { name: 'Inline (one field at a time)', value: 'inline' },
              {
                name: 'Text editor (edit all fields at once)',
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
              message: 'Choose an icon for your agent (emoji):',
              default: existingAgent.icon || '🤖',
            },
            {
              type: 'input',
              name: 'roleInstructions',
              message: 'Enter role instructions:',
              default: existingAgent.instructions?.role || '',
            },
            {
              type: 'input',
              name: 'goalInstructions',
              message: 'Enter goal instructions:',
              default: existingAgent.instructions?.goal || '',
            },
            {
              type: 'input',
              name: 'generalInstructions',
              message: 'Enter general instructions:',
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

          console.log(chalk.blue('Opening text editor for agent details...'));
          console.log(
            chalk.yellow('Current instructions being loaded in editor:'),
          );
          console.log(JSON.stringify(currentInstructions, null, 2));

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
            // Parse the JSON from the editor
            console.log('Received content from editor, parsing JSON...');
            const editorData = JSON.parse(editorContent.content);
            console.log('Successfully parsed JSON from editor');

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

            // Log the update data to help debug
            console.log(
              chalk.blue('Parsed update data:'),
              JSON.stringify(updateData, null, 2),
            );
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
        console.log(chalk.blue('\nUpdating agent...'));
        const updatedAgent = await client.updateAgent(agentId, updateData);

        if (updatedAgent) {
          console.log(chalk.green('\n✨ Agent updated successfully!\n'));

          // Ask about deployment
          const deployAnswer = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'deploy',
              message: 'Would you like to deploy the updated agent?',
              default: true,
            },
          ]);

          if (deployAnswer.deploy) {
            console.log(chalk.blue('\nDeploying agent...'));
            try {
              await client.deployAgent(updatedAgent.id);
              console.log(chalk.green('\n✨ Agent deployed successfully!\n'));
            } catch (deployError) {
              console.error(chalk.red('\n❌ Error deploying agent:'));
              console.error(
                chalk.red('The agent was updated but could not be deployed.'),
              );
              if (deployError instanceof Error) {
                console.error(chalk.red(deployError.message));
              }
            }
          }

          // Display final agent details
          console.log(chalk.bold('\nUpdated Agent Details:'));
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`${chalk.bold('Name:')}        ${updatedAgent.name}`);
          console.log(`${chalk.bold('ID:')}          ${updatedAgent.id}`);
          console.log(`${chalk.bold('Status:')}      ${updatedAgent.status}`);
          console.log(`${chalk.bold('Type:')}        ${updatedAgent.type}`);
          console.log(
            `${chalk.bold('Model:')}       ${updatedAgent.model_provider} / ${updatedAgent.model_name}`,
          );
          if ('icon' in updatedAgent && updatedAgent.icon) {
            console.log(`${chalk.bold('Icon:')}        ${updatedAgent.icon}`);
          }
          if (updatedAgent.description) {
            console.log(
              `${chalk.bold('Description:')} ${updatedAgent.description}`,
            );
          }
          if (updatedAgent.instructions) {
            console.log(`\n${chalk.bold('Instructions:')}`);
            if (updatedAgent.instructions.role) {
              console.log(
                `${chalk.bold('Role:')}     ${updatedAgent.instructions.role}`,
              );
            }
            if (updatedAgent.instructions.goal) {
              console.log(
                `${chalk.bold('Goal:')}     ${updatedAgent.instructions.goal}`,
              );
            }
            if (updatedAgent.instructions.general) {
              console.log(
                `${chalk.bold('General:')}  ${updatedAgent.instructions.general}`,
              );
            }
          }
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        } else {
          console.error(chalk.red('\n❌ Failed to update agent.'));
          console.error(
            chalk.red('Please check the logs above for more details.'),
          );
        }
      } catch (error) {
        console.error(chalk.red('\n❌ Error updating agent:'));
        if (error instanceof Error) {
          console.error(chalk.red(error.message));
        } else {
          console.error(chalk.red('An unknown error occurred'));
        }
      }
    });
}

// Commenting out unused function to fix compilation error
// function isAgentActive(agentItem: Agent): boolean {
//   return agentItem.status === 'active';
// }
