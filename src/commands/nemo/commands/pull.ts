import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { CommandType } from '../../../types';
import { createClient } from '../../../utils/client';
import {
  validateNeMoSyncEnvironment,
  validateAgentNeMoSupport,
  updateNeMoConfigWithAgent,
} from '../../../utils/nemo-sync';

/**
 * Register pull command to sync agent configuration to local NeMo config
 */
export function registerPullCommand(nemoCmd: Command): void {
  nemoCmd
    .command(CommandType.Pull)
    .description('Pull agent model configuration to local NeMo config')
    .option('--profile <name>', 'Profile to use')
    .action(async (options) => {
      const spinner = ora('Initializing pull operation...').start();
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

        // Step 3: Display current agent model configuration
        console.log('\n' + chalk.bold.blue('🤖 Agent Model Configuration'));
        console.log(chalk.dim('─'.repeat(50)));
        console.log(
          chalk.bold('Provider: ') + chalk.yellow(agent.model_provider),
        );
        console.log(chalk.bold('Model:    ') + chalk.yellow(agent.model_name));
        console.log(chalk.dim('─'.repeat(50)));

        // Step 4: Update local NeMo config
        const updateSpinner = ora(
          'Updating local NeMo configuration...',
        ).start();
        await updateNeMoConfigWithAgent(currentDirectory, agent);
        updateSpinner.succeed('NeMo configuration updated successfully');

        // Step 5: Success message
        console.log('\n' + chalk.green.bold('✅ Pull operation completed!'));
        console.log(
          chalk.dim(
            'Your local nemo_config.yml has been updated with the latest agent model configuration.',
          ),
        );

        console.log('\n' + chalk.blue('💡 Next steps:'));
        console.log(
          chalk.dim('• Run your agent locally: ') +
            chalk.cyan('xpander agent dev'),
        );
        console.log(
          chalk.dim('• Make changes to nemo_config.yml and push them back: ') +
            chalk.cyan('xpander agent push'),
        );
      } catch (error: any) {
        spinner.fail('Pull operation failed');
        console.error(chalk.red('❌ Error:'), error.message || String(error));

        if (error.message.includes('yaml')) {
          console.error(
            chalk.yellow(
              '💡 Tip: Check that your nemo_config.yml file has valid YAML syntax.',
            ),
          );
        }
      }
    });
}
