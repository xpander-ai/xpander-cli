import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { CommandType } from '../../../types';
import { createClient } from '../../../utils/client';
import {
  validateNeMoSyncEnvironment,
  validateAgentNeMoSupport,
  extractLLMConfigFromNeMo,
} from '../../../utils/nemo-sync';

/**
 * Register push command to sync local NeMo config to agent
 */
export function registerPushCommand(nemoCmd: Command): void {
  nemoCmd
    .command(CommandType.Push)
    .description('Push local NeMo config changes to agent')
    .option('--profile <name>', 'Profile to use')
    .option('--confirm', 'Skip confirmation prompts')
    .action(async (options) => {
      const spinner = ora('Initializing push operation...').start();
      const currentDirectory = process.cwd();

      try {
        // Step 1: Validate environment
        spinner.text = 'Validating environment...';
        const envValidation =
          await validateNeMoSyncEnvironment(currentDirectory);
        if (!envValidation.valid) {
          spinner.fail('Environment validation failed');
          console.error(chalk.red(`❌ ${envValidation.error}`));
          return;
        }

        const agentId = envValidation.agentId!;
        spinner.succeed(`Found agent ID: ${chalk.dim(agentId)}`);

        // Step 2: Create client and validate agent
        const client = createClient(options.profile);
        const clientSpinner = ora('Fetching agent details...').start();

        const agentValidation = await validateAgentNeMoSupport(client, agentId);
        if (!agentValidation.valid) {
          clientSpinner.fail('Agent validation failed');
          console.error(chalk.red(`❌ ${agentValidation.error}`));
          return;
        }

        const agent = agentValidation.agent!;
        clientSpinner.succeed(
          `Found NeMo-enabled agent: ${chalk.cyan(agent.name)}`,
        );

        // Step 3: Extract LLM config from local NeMo file
        const configSpinner = ora(
          'Reading local NeMo configuration...',
        ).start();
        const llmConfig = await extractLLMConfigFromNeMo(currentDirectory);
        configSpinner.succeed('NeMo configuration loaded');

        // Step 4: Display configuration comparison
        console.log('\n' + chalk.bold.blue('🔄 Configuration Comparison'));
        console.log(chalk.dim('─'.repeat(60)));

        console.log(chalk.bold('Current Agent Configuration:'));
        console.log(
          chalk.dim('  Provider: ') + chalk.yellow(agent.model_provider),
        );
        console.log(chalk.dim('  Model:    ') + chalk.yellow(agent.model_name));

        console.log('\n' + chalk.bold('Local NeMo Configuration:'));
        console.log(
          chalk.dim('  Provider: ') + chalk.green(llmConfig.modelProvider),
        );
        console.log(
          chalk.dim('  Model:    ') + chalk.green(llmConfig.modelName),
        );

        console.log(chalk.dim('─'.repeat(60)));

        // Step 5: Check if there are any changes
        const hasChanges =
          agent.model_provider !== llmConfig.modelProvider ||
          agent.model_name !== llmConfig.modelName;

        if (!hasChanges) {
          console.log(
            chalk.green(
              '\n✅ No changes detected. Agent and local NeMo config are already in sync.',
            ),
          );
          return;
        }

        // Step 6: Confirm push operation (unless --confirm flag is used)
        if (!options.confirm) {
          const { shouldPush } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'shouldPush',
              message:
                'Do you want to update the agent with the local NeMo configuration?',
              default: true,
            },
          ]);

          if (!shouldPush) {
            console.log(chalk.yellow('Push operation cancelled.'));
            return;
          }
        }

        // Step 7: Update the agent
        const updateSpinner = ora('Updating agent configuration...').start();
        const updatedAgent = await client.updateAgent(agentId, {
          model_provider: llmConfig.modelProvider,
          model_name: llmConfig.modelName,
        });

        if (!updatedAgent) {
          updateSpinner.fail('Failed to update agent');
          console.error(
            chalk.red(
              '❌ Agent update failed. Please check the logs above for more details.',
            ),
          );
          return;
        }

        updateSpinner.succeed('Agent configuration updated successfully');

        // Step 8: Deploy the updated agent
        const deploySpinner = ora('Deploying updated agent...').start();
        const deploySuccess = await client.deployAgent(agentId);

        if (deploySuccess) {
          deploySpinner.succeed('Agent deployed successfully');
        } else {
          deploySpinner.fail('Agent deployment failed');
          console.error(
            chalk.red(
              '❌ The agent was updated but could not be deployed. You may need to deploy manually.',
            ),
          );
        }

        // Step 9: Success message
        console.log('\n' + chalk.green.bold('✅ Push operation completed!'));
        console.log(
          chalk.dim(
            'Your agent has been updated with the local NeMo configuration.',
          ),
        );

        console.log('\n' + chalk.blue('💡 Next steps:'));
        console.log(
          chalk.dim('• Test your agent: ') +
            chalk.cyan(`xpander agent invoke "Hello, test the new model"`),
        );
        console.log(
          chalk.dim('• Pull latest config: ') +
            chalk.cyan('xpander agent pull'),
        );
      } catch (error: any) {
        spinner.fail('Push operation failed');
        console.error(chalk.red('❌ Error:'), error.message || String(error));

        if (error.message.includes('yaml')) {
          console.error(
            chalk.yellow(
              '💡 Tip: Check that your nemo_config.yml file has valid YAML syntax.',
            ),
          );
        } else if (
          error.message.includes('model_provider') ||
          error.message.includes('model_name')
        ) {
          console.error(
            chalk.yellow(
              '💡 Tip: Ensure your NeMo config has valid _type and model_name fields in the LLM configuration.',
            ),
          );
        }
      }
    });
}
