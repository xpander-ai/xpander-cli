import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { CommandType } from '../../../types';
import { getTemplateById } from '../../../types/templates';
import { XpanderClient } from '../../../utils/client';
import { getApiKey } from '../../../utils/config';
import { initializeAgentWithTemplate } from '../../../utils/template-cloner';
import {
  selectTemplate,
  displayTemplateInfo,
} from '../../../utils/template-selector';

/**
 * Register new command to create agents
 */
export function registerNewCommand(agentCmd: Command): void {
  // Create a new agent
  agentCmd
    .command(CommandType.New)
    .alias('n')
    .description('Create a new agent with optional auto-initialization')
    .option('--name <name>', 'Name for the new agent')
    .option('--model <model>', 'Model to use (default: gpt-4o)')
    .option('--profile <name>', 'Profile to use')
    .option(
      '--framework <framework>',
      'Framework template to use (agno, agno-team, base)',
    )
    .option(
      '--folder <folder>',
      'Folder to initialize agent in (enables non-interactive mode)',
    )
    .option('--init', 'Show initialization wizard after creating agent')
    .option('--json', 'Output result in JSON format')
    .action(async (options) => {
      try {
        let { name, profile, framework, folder, init } = options as {
          name?: string;
          profile?: string;
          framework?: string;
          folder?: string;
          init?: boolean;
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

        // Create a more appealing welcome screen
        console.log('\n');
        console.log(chalk.bold.blue('✨ Agent Creation Wizard ✨'));
        console.log(chalk.dim('─'.repeat(50)));
        // First, select template
        let selectedTemplate;
        if (framework) {
          // Non-interactive mode: use specified framework
          selectedTemplate = getTemplateById(framework);
          if (!selectedTemplate) {
            console.error(
              chalk.red(
                `❌ Invalid framework: ${framework}. Available: agno, agno-team, base`,
              ),
            );
            process.exit(1);
          }
          if (folder) {
            console.log(chalk.cyan(`Using ${selectedTemplate.name} template`));
          } else {
            displayTemplateInfo(selectedTemplate);
          }
        } else {
          // Interactive mode: prompt for template
          console.log(chalk.cyan('Step 1: Choose a template for your agent\n'));
          try {
            selectedTemplate = await selectTemplate();
            displayTemplateInfo(selectedTemplate);
          } catch (templateError: any) {
            console.error(
              chalk.red('❌ Template selection cancelled or failed:'),
              templateError.message,
            );
            process.exit(1);
          }
        }

        // If no name provided, prompt for it (unless in non-interactive mode)
        if (!name) {
          if (folder) {
            console.error(
              chalk.red('❌ --name is required when using --folder'),
            );
            process.exit(1);
          }
          console.log(chalk.cyan('\nStep 2: Name your agent\n'));
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

        console.log(chalk.dim('─'.repeat(50)));
        console.log(chalk.green.bold('\n✅ Agent creation complete!\n'));

        // Handle initialization based on provided options
        if (folder) {
          // Auto-initialize in the specified folder
          console.log(chalk.cyan(`Initializing agent in ${folder}...`));
          try {
            await initializeAgentWithTemplate(
              client,
              createdAgent.id,
              selectedTemplate,
              true, // nonInteractive mode when folder is specified
              folder,
            );
          } catch (templateError: any) {
            console.error(
              chalk.red('❌ Template initialization failed:'),
              templateError.message,
            );
            console.log(
              chalk.yellow(
                'You can initialize the agent later using: xpander agent init ' +
                  createdAgent.id,
              ),
            );
          }
        } else if (init) {
          // Show initialization wizard
          console.log(chalk.cyan('Step 3: Initialize agent with template\n'));
          try {
            await initializeAgentWithTemplate(
              client,
              createdAgent.id,
              selectedTemplate,
              false, // interactive mode for wizard
              undefined, // no specific folder for wizard mode
            );
          } catch (templateError: any) {
            console.error(
              chalk.red('❌ Template initialization failed:'),
              templateError.message,
            );
            console.log(
              chalk.yellow(
                'You can initialize the agent later using: xpander agent init ' +
                  createdAgent.id,
              ),
            );
          }
        } else {
          // Just return agent info without initialization
          console.log(chalk.blue('🔑 Agent Information:'));
          console.log(chalk.gray('Agent ID: ') + chalk.white(createdAgent.id));
          console.log(chalk.gray('API Key: ') + chalk.white(apiKey));
          console.log(
            chalk.gray('Agent Workbench: ') +
              chalk.blue(`https://app.xpander.ai/agents/${createdAgent.id}`),
          );

          // Fetch the actual webhook URL from the agent endpoint
          try {
            const agentDetails = await client.getAgentWebhookDetails(
              createdAgent.id,
            );

            // Extract webhook URL from response (adjust based on actual API response structure)
            const webhookUrl =
              agentDetails.webhook_url ||
              `https://webhook.xpander.ai/?agent_id=${createdAgent.id}&asynchronous=false`;

            console.log(chalk.gray('Webhook URL: ') + chalk.white(webhookUrl));

            console.log('\n' + chalk.blue('🌐 Ready-to-use curl command:'));
            console.log(chalk.cyan(`curl -X POST "${webhookUrl}" \\`));
            console.log(chalk.cyan(`  -H "x-api-key: ${apiKey}" \\`));
            console.log(chalk.cyan(`  -H "Content-Type: application/json" \\`));
            console.log(
              chalk.cyan(`  -d '{"message": "Hi, what can you do?"}' \\`),
            );
            console.log(chalk.cyan(`  | jq`));
          } catch (webhookError) {
            console.log(
              chalk.yellow(
                '⚠️ Could not fetch webhook URL, using default format',
              ),
            );
          }

          console.log('\n' + chalk.yellow('💡 Next steps:'));
          console.log(
            chalk.dim('• Download the Agent code locally: ') +
              chalk.cyan(`x a i ${createdAgent.name}`),
          );
          console.log(
            chalk.dim('• Or to a specific folder: ') +
              chalk.cyan(
                `x a i ${createdAgent.name} --folder "~/Developer/Agents/${createdAgent.name}"`,
              ),
          );
        }
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
}
