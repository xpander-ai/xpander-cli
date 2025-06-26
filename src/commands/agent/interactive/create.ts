import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { XpanderClient } from '../../../utils/client';
import { initializeAgentWithTemplate } from '../../../utils/template-cloner';
import {
  selectTemplate,
  displayTemplateInfo,
} from '../../../utils/template-selector';

/**
 * Create a new agent with interactive prompts
 */
export async function createNewAgent(client: XpanderClient) {
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

    console.log(chalk.green('\n✅ Agent created and ready to use!'));
    createSpinner.stop();
    const { shouldInitialize } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldInitialize',
        message:
          'Do you want to initialize this agent with a template in your current directory?',
        default: true,
      },
    ]);

    if (shouldInitialize) {
      try {
        // Template selection
        const selectedTemplate = await selectTemplate();
        displayTemplateInfo(selectedTemplate);

        // Initialize agent with selected template
        await initializeAgentWithTemplate(
          client,
          newAgent.id,
          selectedTemplate,
        );
      } catch (templateError: any) {
        console.error(
          chalk.red('❌ Template initialization failed:'),
          templateError.message,
        );
        console.log(
          chalk.yellow(
            'You can initialize the agent later using: xpander agent init ' +
              newAgent.id,
          ),
        );
      }
    }
  } catch (error: any) {
    createSpinner.fail('Failed to create agent');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}
