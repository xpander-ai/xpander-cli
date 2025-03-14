import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { createClient, XpanderClient } from '../utils/client';
import { getApiKey } from '../utils/config';
import { formatOutput } from '../utils/formatter';

/**
 * Helper function to colorize agent status
 */
function colorizeStatus(status?: string): string {
  if (!status) return chalk.gray('Unknown');

  const statusUpper = status.toUpperCase();

  switch (statusUpper) {
    case 'ACTIVE':
      return chalk.green(statusUpper);
    case 'INACTIVE':
      return chalk.yellow(statusUpper);
    case 'DELETED':
      return chalk.red(statusUpper);
    case 'SUSPENDED':
      return chalk.red(statusUpper);
    case 'PENDING':
      return chalk.blue(statusUpper);
    default:
      return chalk.white(statusUpper);
  }
}

/**
 * Configure agent-related commands
 */
export function agent(program: Command): void {
  const agentCmd = program.command('agent').description('Manage agents');

  // Add interactive mode as the default command when just running 'xpander agent'
  agentCmd.action(async () => {
    await interactiveAgentMode();
  });

  // Interactive mode (explicitly called via 'agent interactive')
  agentCmd
    .command('interactive')
    .description('Interactive agent management mode')
    .action(async () => {
      await interactiveAgentMode();
    });

  // List all agents
  agentCmd
    .command('list')
    .description('List all agents')
    .option('--json', 'Output in JSON format')
    .option('--all', 'Show all agents, including inactive ones')
    .option('--profile <n>', 'Profile to use')
    .action(async (options) => {
      try {
        const apiKey = getApiKey(options.profile);
        if (!apiKey) {
          console.error(chalk.red('No API key found.'));
          console.error(
            chalk.yellow(
              'Please run "xpander configure" to set up your credentials.',
            ),
          );
          return;
        }

        console.log('');
        console.log('');
        console.log(chalk.cyan('🤖 Your Agents'));
        console.log('──────────────────────────────────────────────────');

        const client = createClient(options.profile);
        const agentsList = await client.getAgents();

        if (!agentsList || agentsList.length === 0) {
          console.log(chalk.yellow('No agents found.'));
          console.log(
            chalk.yellow('Use "xpander agent new" to create your first agent.'),
          );
          console.log('──────────────────────────────────────────────────');
          return;
        }

        // Filter inactive agents if not showing all
        const filteredAgents = options.all
          ? agentsList
          : agentsList.filter((agentItem) => {
              // 1. Must be active
              if (agentItem.status !== 'ACTIVE') return false;

              // 2. Must have multiple tools (this is the key insight from our analysis)
              if (!agentItem.tools || agentItem.tools.length <= 1) return false;

              return true;
            });

        // Use JSON format if requested
        if (options.json) {
          console.log(JSON.stringify(filteredAgents, null, 2));
          return;
        }

        // Sort agents by creation date (newest first)
        filteredAgents.sort((a, b) => {
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });

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

        // Display in table format
        formatOutput(formattedAgents, {
          title: '', // Remove title as we're adding our own
          columns: ['id', 'name', 'model', 'tools_count', 'created_at'],
          headers: ['ID', 'Name', 'Model', 'Tools', 'Created'],
        });

        console.log('──────────────────────────────────────────────────');
        console.log(`Total agents: ${filteredAgents.length}`);
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
        } else {
          console.error(
            chalk.red('Error fetching agents:'),
            error.message || String(error),
          );
        }
      }
    });

  // List agents in JSON format (alias for list --json)
  agentCmd
    .command('list-json')
    .description('List all agents in raw JSON format')
    .option('--all', 'Show all agents, including inactive ones')
    .option('--profile <name>', 'Profile to use')
    .action(async (options) => {
      // Simply execute the list command's action with the json flag set
      try {
        const apiKey = getApiKey(options.profile);
        if (!apiKey) {
          console.error(chalk.red('No API key found.'));
          console.error(
            chalk.yellow(
              'Please run "xpander configure" to set up your credentials.',
            ),
          );
          return;
        }

        const client = createClient(options.profile);
        const agentsList = await client.getAgents();

        if (!agentsList || agentsList.length === 0) {
          console.log(chalk.yellow('No agents found.'));
          console.log(
            chalk.yellow('Use "xpander agent new" to create your first agent.'),
          );
          return;
        }

        // Filter inactive agents if not showing all (same logic as list command)
        const filteredAgents = options.all
          ? agentsList
          : agentsList.filter((agentItem) => {
              // 1. Must be active
              if (agentItem.status !== 'ACTIVE') return false;

              // 2. Must have multiple tools
              if (!agentItem.tools || agentItem.tools.length <= 1) return false;

              return true;
            });

        // Output in JSON format (that's the whole purpose of list-json)
        console.log(JSON.stringify(filteredAgents, null, 2));
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
        } else {
          console.error(
            chalk.red('Error fetching agents:'),
            error.message || String(error),
          );
        }
      }
    });

  // Get details about a specific agent
  agentCmd
    .command('get')
    .description('Get details about an agent')
    .requiredOption('--id <agent_id>', 'ID of the agent to get details for')
    .option('--json', 'Output in JSON format')
    .option('--profile <name>', 'Profile to use')
    .action(async (options) => {
      try {
        const apiKey = getApiKey(options.profile);
        if (!apiKey) {
          console.error(chalk.red('No API key found.'));
          console.error(
            chalk.yellow(
              'Please run "xpander configure" to set up your credentials.',
            ),
          );
          return;
        }

        const client = createClient(options.profile);
        const agentDetails = await client.getAgent(options.id);

        if (!agentDetails) {
          console.error(chalk.red(`Agent with ID "${options.id}" not found.`));
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(agentDetails, null, 2));
          return;
        }

        console.log('');
        console.log('');
        console.log(chalk.cyan('🤖 Agent Details'));
        console.log('──────────────────────────────────────────────────');

        // Display agent details in a readable format
        console.log(`Name:     ${agentDetails.name}`);
        console.log(`ID:       ${agentDetails.id}`);
        console.log(`Status:   ${agentDetails.status}`);
        console.log(`Type:     ${agentDetails.type || 'regular'}`);
        console.log(`Model:    ${agentDetails.model_name || 'gpt-4o'}`);
        console.log(`Version:  ${agentDetails.version || 1}`);
        console.log(`Tools:    ${agentDetails.tools?.length || 0}`);
        console.log(`Icon:     ${agentDetails.icon || '🤖'}`);

        // Format date nicely
        const created = new Date(agentDetails.created_at);
        console.log(`Created:  ${created.toLocaleDateString()}`);

        // Display instructions if available
        console.log('');
        console.log('Instructions:');
        if (agentDetails.instructions?.role)
          console.log(`• Role:    ${agentDetails.instructions.role}`);
        if (agentDetails.instructions?.goal)
          console.log(`• Goal:    ${agentDetails.instructions.goal}`);
        if (agentDetails.instructions?.general)
          console.log(`• General: ${agentDetails.instructions.general}`);

        console.log('──────────────────────────────────────────────────');
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
            chalk.red('Error fetching agent:'),
            error.message || String(error),
          );
        }
      }
    });

  // Create a new agent
  agentCmd
    .command('new')
    .description('Create a new agent')
    .option('--name <name>', 'Name for the new agent')
    .option('--model <model>', 'Model to use (default: gpt-4o)')
    .option('--profile <name>', 'Profile to use')
    .option('--json', 'Output result in JSON format')
    .option('--skip-details', 'Skip the personalization step')
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
      } catch (error: any) {
        if (error.status === 403) {
          console.error(chalk.red('❌ Failed to create agent:'));
          console.error(chalk.red('Error code: 403'));
          console.error(chalk.red('Message: Access denied'));

          console.error('');
          console.error(chalk.red('❌ Error creating agent:'));
          console.error(chalk.red('Failed to create agent'));
        } else {
          console.error(
            chalk.red('❌ Error creating agent:'),
            error.message || String(error),
          );
        }
      }
    });

  // Delete an agent
  agentCmd
    .command('delete')
    .description('Delete an agent')
    .requiredOption('--id <agent_id>', 'ID of the agent to delete')
    .option('--confirm', 'Skip confirmation prompt')
    .option('--profile <name>', 'Profile to use')
    .action(async (options) => {
      try {
        let agentId = options.id;

        // If no ID provided, prompt user to select from available agents
        if (!agentId) {
          // Create a spinner for better visual feedback
          const loadingSpinner = process.stdout.isTTY
            ? ora({
                text: chalk.blue('Loading available agents...'),
                spinner: 'dots',
              }).start()
            : { succeed: console.log, fail: console.error, stop: () => {} };

          const client = createClient();
          const agents = await client.getAgents();

          loadingSpinner.stop();

          if (agents.length === 0) {
            console.log('\n' + chalk.yellow('✨ No agents found.'));
            return;
          }

          console.log('\n');
          console.log(chalk.bold.red('⚠️ Delete Agent'));
          console.log(chalk.dim('─'.repeat(50)));
          console.log(
            chalk.yellow('Please select the agent you wish to delete:'),
          );

          const choices = agents.map((agentItem) => ({
            name: `${agentItem.name} ${chalk.dim(`(${agentItem.id})`)}`,
            value: (agentId = agentItem.id),
          }));

          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'agentId',
              message: 'Which agent would you like to delete?',
              choices,
              pageSize: 15,
            },
          ]);

          agentId = answers.agentId;
        }

        // Get agent details for confirmation
        const client = createClient();
        const agentData = await client.getAgent(agentId);

        if (!agentData) {
          console.log(
            '\n' + chalk.yellow(`⚠️ Agent with ID ${agentId} not found.`),
          );
          return;
        }

        // Show warning with agent details
        console.log('\n');
        console.log(chalk.bold.red('🗑️ Delete Confirmation'));
        console.log(chalk.dim('─'.repeat(50)));
        console.log(
          chalk.yellow('You are about to delete the following agent:'),
        );
        console.log('\n');
        console.log(chalk.bold('Name:     ') + chalk.cyan(agentData.name));
        console.log(chalk.bold('ID:       ') + chalk.dim(agentData.id));
        if ('icon' in agentData && agentData.icon) {
          console.log(chalk.bold('Icon:     ') + agentData.icon);
        }
        console.log('\n');
        console.log(chalk.red('⚠️ This action cannot be undone!'));
        console.log(chalk.dim('─'.repeat(50)));

        // Confirm deletion
        const confirmation = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: `Are you sure you want to permanently delete this agent?`,
            default: false,
          },
        ]);

        if (!confirmation.confirmed) {
          console.log(
            chalk.blue('\n✓ Operation cancelled. Agent was not deleted.'),
          );
          return;
        }

        // Create a spinner for deletion
        const spinner = process.stdout.isTTY
          ? ora({
              text: chalk.blue(`Deleting agent...`),
              spinner: 'dots',
            }).start()
          : { succeed: console.log, fail: console.error, stop: () => {} };

        const success = await client.deleteAgent(agentId);

        if (success) {
          spinner.succeed(chalk.green(`Agent deleted successfully!`));
        } else {
          spinner.fail(
            chalk.yellow(`Could not delete agent. Please try again.`),
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
            chalk.red('Error deleting agent:'),
            error.message || String(error),
          );
        }
      }
    });

  // Update an agent
  agentCmd
    .command('update')
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

        // If no ID provided, prompt user to select from available agents
        if (!agentId) {
          // Create a spinner for better visual feedback
          const loadingSpinner = process.stdout.isTTY
            ? ora({
                text: chalk.blue('Loading available agents...'),
                spinner: 'dots',
              }).start()
            : { succeed: console.log, fail: console.error, stop: () => {} };

          const client = createClient();
          const agents = await client.getAgents();

          loadingSpinner.stop();

          if (agents.length === 0) {
            console.log('\n' + chalk.yellow('✨ No agents found.'));
            return;
          }

          console.log('\n');
          console.log(chalk.bold.blue('✏️ Update Agent'));
          console.log(chalk.dim('─'.repeat(50)));

          const choices = agents.map((agentItem) => ({
            name: `${agentItem.name} ${chalk.dim(`(${agentItem.id})`)}`,
            value: agentItem.id,
          }));

          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'agentId',
              message: 'Which agent would you like to update?',
              choices,
              pageSize: 15,
            },
          ]);

          agentId = answers.agentId;
        }

        // Create a spinner for better visual feedback
        const spinner = process.stdout.isTTY
          ? ora({
              text: chalk.blue(`Fetching agent details...`),
              spinner: 'dots',
            }).start()
          : { succeed: console.log, fail: console.error, stop: () => {} };

        const client = createClient();
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

/**
 * Interactive agent management mode
 */
async function interactiveAgentMode() {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error(chalk.red('No API key found.'));
      console.error(
        chalk.yellow(
          'Please run "xpander configure" to set up your credentials.',
        ),
      );
      return;
    }

    // Display welcome banner
    console.log('');
    console.log(chalk.bold.cyan('🤖 Xpander Agent Management'));
    console.log(chalk.dim('─'.repeat(60)));
    console.log(
      chalk.blue('Interactive mode - Select agents and manage them with ease'),
    );
    console.log(chalk.dim('─'.repeat(60)));

    const client = createClient();

    // Main interactive loop
    let exitRequested = false;
    while (!exitRequested) {
      // Fetch agents
      const fetchSpinner = ora('Fetching your agents...').start();
      const agentsList = await client.getAgents();
      fetchSpinner.succeed('Agents loaded successfully');

      if (!agentsList || agentsList.length === 0) {
        console.log(chalk.yellow('\nNo agents found.'));

        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: 'Create a new agent', value: 'create' },
              { name: 'Exit', value: 'exit' },
            ],
          },
        ]);

        if (action === 'create') {
          await createNewAgent(client);
          continue;
        } else {
          exitRequested = true;
          continue;
        }
      }

      // Sort agents by creation date (newest first)
      const agents = [...agentsList].sort((a, b) => {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      // Display agents in a table
      displayAgentTable(agents);

      // Offer available actions
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'View agent details', value: 'view' },
            { name: 'Create a new agent', value: 'create' },
            { name: 'Update an agent', value: 'update' },
            { name: 'Delete agents (single or multiple)', value: 'delete' },
            { name: 'Exit', value: 'exit' },
          ],
        },
      ]);

      switch (action) {
        case 'view':
          await viewAgentDetails(client, agents);
          break;
        case 'create':
          await createNewAgent(client);
          break;
        case 'update':
          await updateExistingAgent(client, agents);
          break;
        case 'delete':
          await deleteAgents(client, agents);
          break;
        case 'exit':
          exitRequested = true;
          console.log(chalk.blue('\nExiting agent management. Goodbye!'));
          break;
      }

      // If not exiting, add a small pause between actions
      if (!exitRequested) {
        const { continue: shouldContinue } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continue',
            message: 'Return to main menu?',
            default: true,
          },
        ]);

        if (!shouldContinue) {
          exitRequested = true;
          console.log(chalk.blue('\nExiting agent management. Goodbye!'));
        }
      }
    }
  } catch (error: any) {
    console.error(
      chalk.red('Error in interactive mode:'),
      error.message || String(error),
    );
  }
}

/**
 * Helper function to display agents in a table
 */
function displayAgentTable(agents: any[]) {
  const table = new Table({
    head: [
      chalk.bold('ID'),
      chalk.bold('Name'),
      chalk.bold('Status'),
      chalk.bold('Model'),
      chalk.bold('Created'),
    ],
    style: {
      head: [], // Disable colors in header
      border: [], // Disable colors for borders
    },
  });

  agents.forEach((agentEntry) => {
    let createdDate = '';
    try {
      createdDate = new Date(agentEntry.created_at).toLocaleDateString();
    } catch (e) {
      createdDate = agentEntry.created_at || '';
    }

    table.push([
      chalk.dim(agentEntry.id),
      chalk.cyan(agentEntry.name),
      colorizeStatus(agentEntry.status),
      chalk.yellow(agentEntry.model_name || ''),
      createdDate,
    ]);
  });

  console.log('\n' + table.toString() + '\n');
}

/**
 * View details of a selected agent
 */
async function viewAgentDetails(client: XpanderClient, agents: any[]) {
  const { agentId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'agentId',
      message: 'Select an agent to view:',
      choices: agents.map((agentEntry) => ({
        name: `${agentEntry.name} ${chalk.dim(`(${agentEntry.id})`)}`,
        value: agentEntry.id,
      })),
      pageSize: 15,
    },
  ]);

  const spinner = ora('Fetching agent details...').start();
  try {
    const agentDetails = await client.getAgent(agentId);
    spinner.succeed('Details loaded');

    if (!agentDetails) {
      console.log(chalk.yellow('\nAgent not found or access denied.'));
      return;
    }

    // Display agent details
    console.log('\n');
    console.log(chalk.bold.cyan('🤖 Agent Details'));
    console.log(chalk.dim('─'.repeat(60)));

    console.log(`${chalk.bold('Name:')}      ${agentDetails.name}`);
    console.log(`${chalk.bold('ID:')}        ${chalk.dim(agentDetails.id)}`);
    console.log(
      `${chalk.bold('Status:')}    ${colorizeStatus(agentDetails.status)}`,
    );
    console.log(
      `${chalk.bold('Type:')}      ${agentDetails.type || 'regular'}`,
    );
    console.log(
      `${chalk.bold('Model:')}     ${agentDetails.model_name || 'gpt-4o'}`,
    );
    console.log(`${chalk.bold('Version:')}   ${agentDetails.version || 1}`);
    console.log(
      `${chalk.bold('Tools:')}     ${agentDetails.tools?.length || 0}`,
    );

    if ('icon' in agentDetails && agentDetails.icon) {
      console.log(`${chalk.bold('Icon:')}      ${agentDetails.icon}`);
    }

    // Format date nicely
    const created = new Date(agentDetails.created_at);
    console.log(`${chalk.bold('Created:')}   ${created.toLocaleDateString()}`);

    // Display instructions if available
    if (agentDetails.instructions) {
      console.log('\n' + chalk.bold('Instructions:'));
      if (agentDetails.instructions.role)
        console.log(
          `${chalk.bold('• Role:')}     ${agentDetails.instructions.role}`,
        );
      if (agentDetails.instructions.goal)
        console.log(
          `${chalk.bold('• Goal:')}     ${agentDetails.instructions.goal}`,
        );
      if (agentDetails.instructions.general)
        console.log(
          `${chalk.bold('• General:')}  ${agentDetails.instructions.general}`,
        );
    }

    console.log(chalk.dim('─'.repeat(60)));

    // Offer additional actions for this agent
    const { nextAction } = await inquirer.prompt([
      {
        type: 'list',
        name: 'nextAction',
        message: 'What would you like to do with this agent?',
        choices: [
          { name: 'Update this agent', value: 'update' },
          { name: 'Delete this agent', value: 'delete' },
          { name: 'Return to main menu', value: 'main' },
        ],
      },
    ]);

    if (nextAction === 'update') {
      await updateSpecificAgent(client, agentDetails);
    } else if (nextAction === 'delete') {
      await deleteSpecificAgent(client, agentDetails);
    }
    // Return to main menu happens automatically
  } catch (error: any) {
    spinner.fail('Failed to fetch agent details');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}

/**
 * Create a new agent with interactive prompts
 */
async function createNewAgent(client: XpanderClient) {
  console.log('\n');
  console.log(chalk.bold.blue('✨ Create New Agent'));
  console.log(chalk.dim('─'.repeat(60)));

  const { agentName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'agentName',
      message: 'Enter a name for your new agent:',
      validate: (input) => (input.trim() ? true : 'Name is required'),
    },
  ]);

  const createSpinner = ora(`Creating agent "${agentName}"...`).start();
  try {
    const newAgent = await client.createAgent(agentName);
    createSpinner.succeed(`Agent created successfully`);

    // Prompt for personalization
    const { personalize } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'personalize',
        message: 'Would you like to personalize your agent now?',
        default: true,
      },
    ]);

    if (personalize) {
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

      const updateData: {
        icon?: string;
        instructions?: { role?: string; goal?: string; general?: string };
      } = {
        icon: details.icon,
        instructions: {},
      };

      if (details.roleInstructions)
        updateData.instructions!.role = details.roleInstructions;
      if (details.goalInstructions)
        updateData.instructions!.goal = details.goalInstructions;
      if (details.generalInstructions)
        updateData.instructions!.general = details.generalInstructions;

      // Only include instructions if at least one field is filled
      if (!Object.keys(updateData.instructions!).length) {
        delete updateData.instructions;
      }

      const updateSpinner = ora('Applying personalization...').start();
      const updatedAgent = await client.updateAgent(newAgent.id, updateData);

      if (updatedAgent) {
        updateSpinner.succeed('Personalization applied successfully');

        // Deploy the agent
        const deploySpinner = ora('Deploying agent...').start();
        await client.deployAgent(updatedAgent.id);
        deploySpinner.succeed('Agent deployed successfully');

        console.log(chalk.green('\n✅ Agent created and ready to use!'));
      } else {
        updateSpinner.fail('Failed to apply personalization');
        console.log(
          chalk.yellow('Agent was created but personalization failed.'),
        );
      }
    } else {
      // Deploy without personalization
      const deploySpinner = ora('Deploying agent...').start();
      await client.deployAgent(newAgent.id);
      deploySpinner.succeed('Agent deployed successfully');

      console.log(chalk.green('\n✅ Agent created and ready to use!'));
    }
  } catch (error: any) {
    createSpinner.fail('Failed to create agent');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}

/**
 * Update a specific agent
 */
async function updateSpecificAgent(client: XpanderClient, agentItem: any) {
  console.log('\n');
  console.log(chalk.bold.blue('✏️ Update Agent'));
  console.log(chalk.dim('─'.repeat(60)));

  const details = await inquirer.prompt([
    {
      type: 'input',
      name: 'icon',
      message: 'Choose an icon for your agent:',
      default: agentItem.icon || '🤖',
    },
    {
      type: 'input',
      name: 'roleInstructions',
      message: 'What role should your agent perform?',
      default: agentItem.instructions?.role || '',
    },
    {
      type: 'input',
      name: 'goalInstructions',
      message: 'What is the main goal of your agent?',
      default: agentItem.instructions?.goal || '',
    },
    {
      type: 'input',
      name: 'generalInstructions',
      message: 'Any additional instructions for your agent?',
      default: agentItem.instructions?.general || '',
    },
  ]);

  const updateData: {
    icon?: string;
    instructions?: { role?: string; goal?: string; general?: string };
  } = {
    icon: details.icon,
    instructions: {},
  };

  if (details.roleInstructions)
    updateData.instructions!.role = details.roleInstructions;
  if (details.goalInstructions)
    updateData.instructions!.goal = details.goalInstructions;
  if (details.generalInstructions)
    updateData.instructions!.general = details.generalInstructions;

  // Only include instructions if at least one field is filled
  if (!Object.keys(updateData.instructions!).length) {
    delete updateData.instructions;
  }

  const updateSpinner = ora('Updating agent...').start();
  try {
    const updatedAgent = await client.updateAgent(agentItem.id, updateData);

    if (updatedAgent) {
      updateSpinner.succeed('Agent updated successfully');

      // Ask about deployment
      const { deploy } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'deploy',
          message: 'Would you like to deploy the updated agent?',
          default: true,
        },
      ]);

      if (deploy) {
        const deploySpinner = ora('Deploying updated agent...').start();
        await client.deployAgent(updatedAgent.id);
        deploySpinner.succeed('Agent deployed successfully');
      }

      console.log(chalk.green('\n✅ Agent updated successfully!'));
    } else {
      updateSpinner.fail('Failed to update agent');
    }
  } catch (error: any) {
    updateSpinner.fail('Failed to update agent');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}

/**
 * Update an existing agent (with selection)
 */
async function updateExistingAgent(client: XpanderClient, agents: any[]) {
  const { agentId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'agentId',
      message: 'Select an agent to update:',
      choices: agents.map((agentEntry) => ({
        name: `${agentEntry.name} ${chalk.dim(`(${agentEntry.id})`)}`,
        value: agentEntry.id,
      })),
      pageSize: 15,
    },
  ]);

  const spinner = ora('Fetching agent details...').start();
  try {
    const agentDetails = await client.getAgent(agentId);
    spinner.succeed('Details loaded');

    if (!agentDetails) {
      console.log(chalk.yellow('\nAgent not found or access denied.'));
      return;
    }

    await updateSpecificAgent(client, agentDetails);
  } catch (error: any) {
    spinner.fail('Failed to fetch agent details');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}

/**
 * Delete a specific agent
 */
async function deleteSpecificAgent(client: XpanderClient, agentItem: any) {
  console.log('\n');
  console.log(chalk.bold.red('🗑️ Delete Agent'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log(
    chalk.yellow(`You're about to delete: ${chalk.cyan(agentItem.name)}`),
  );
  console.log(chalk.dim(`ID: ${agentItem.id}`));
  console.log(chalk.red('\n⚠️ This action cannot be undone!'));
  console.log(chalk.dim('─'.repeat(60)));

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to delete this agent?',
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.blue('Deletion cancelled.'));
    return;
  }

  const deleteSpinner = ora(`Deleting agent "${agentItem.name}"...`).start();
  try {
    const success = await client.deleteAgent(agentItem.id);

    if (success) {
      deleteSpinner.succeed('Agent deleted successfully');
      console.log(chalk.green('\n✅ Agent has been permanently deleted.'));
    } else {
      deleteSpinner.fail('Failed to delete agent');
    }
  } catch (error: any) {
    deleteSpinner.fail('Failed to delete agent');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}

/**
 * Delete multiple agents with multi-select
 */
async function deleteAgents(client: XpanderClient, agents: any[]) {
  console.log('\n');
  console.log(chalk.bold.red('🗑️ Delete Multiple Agents'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log(chalk.yellow('Select agents to delete:'));
  console.log(
    chalk.dim(
      '(Use space to select, arrow keys to navigate, enter to confirm)',
    ),
  );

  const { selectedAgents } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedAgents',
      message: 'Choose agents to delete:',
      choices: agents.map((agentItem) => ({
        name: `${agentItem.name} ${chalk.dim(`(${agentItem.id})`)}`,
        value: { id: agentItem.id, name: agentItem.name },
      })),
      pageSize: 15,
      validate: (selected) => {
        if (selected.length === 0)
          return 'Please select at least one agent or press Ctrl+C to cancel';
        return true;
      },
    },
  ]);

  if (selectedAgents.length === 0) {
    console.log(chalk.blue('No agents selected. Operation cancelled.'));
    return;
  }

  console.log('\n');
  console.log(chalk.bold.red('⚠️ Confirm Deletion'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log(
    chalk.yellow(`You're about to delete ${selectedAgents.length} agent(s):`),
  );

  selectedAgents.forEach((agentSelected: any, index: number) => {
    console.log(
      `${index + 1}. ${chalk.cyan(agentSelected.name)} ${chalk.dim(`(${agentSelected.id})`)}`,
    );
  });

  console.log(chalk.red('\n⚠️ This action cannot be undone!'));
  console.log(chalk.dim('─'.repeat(60)));

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to delete these ${selectedAgents.length} agent(s)?`,
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.blue('\nDeletion cancelled.'));
    return;
  }

  console.log('\n');
  console.log(chalk.bold('Deleting agents:'));
  console.log(chalk.dim('─'.repeat(60)));

  let successCount = 0;
  let failCount = 0;

  for (const agentSelected of selectedAgents) {
    const deleteSpinner = ora(`Deleting "${agentSelected.name}"...`).start();
    try {
      const success = await client.deleteAgent(agentSelected.id);

      if (success) {
        deleteSpinner.succeed(`Deleted: ${agentSelected.name}`);
        successCount++;
      } else {
        deleteSpinner.fail(`Failed to delete: ${agentSelected.name}`);
        failCount++;
      }
    } catch (error: any) {
      deleteSpinner.fail(`Failed to delete: ${agentSelected.name}`);
      console.error(chalk.red('  Error:'), error.message || String(error));
      failCount++;
    }
  }

  console.log(chalk.dim('─'.repeat(60)));
  console.log(
    `${chalk.green(`✅ Successfully deleted: ${successCount}`)}${failCount > 0 ? chalk.red(` | Failed: ${failCount}`) : ''}`,
  );
}
