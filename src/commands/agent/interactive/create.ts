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

  const agentDetails = await inquirer.prompt([
    {
      type: 'input',
      name: 'agentName',
      message: 'Enter a name for your new agent:',
      validate: (input) => (input.trim() ? true : 'Name is required'),
    },
    {
      type: 'list',
      name: 'deploymentType',
      message: 'Select deployment type:',
      choices: [
        {
          name: `🚀 Serverless ${chalk.dim('(recommended)')}\n   ${chalk.dim('Quick startup, auto-scaling, cost-effective for most use cases')}`,
          value: 'serverless',
          short: 'Serverless',
        },
        {
          name: `🐳 Container\n   ${chalk.dim('Dedicated resources, better performance, consistent environment')}\n   ${chalk.dim('Docs: https://docs.xpander.ai/API%20reference/cli-reference#cloud-deployment-container-management')}`,
          value: 'container',
          short: 'Container',
        },
      ],
      default: 'serverless',
    },
  ]);

  // Display selected deployment type details
  console.log('\n');
  console.log(chalk.bold.green('✅ Selected Deployment Type'));
  console.log(chalk.dim('─'.repeat(40)));

  if (agentDetails.deploymentType === 'serverless') {
    console.log(chalk.bold('🚀 Serverless'));
    console.log(
      chalk.dim('Your agent will run on shared infrastructure with:'),
    );
    console.log(chalk.dim('  • Quick startup and deployment'));
    console.log(chalk.dim('  • Automatic scaling based on demand'));
    console.log(chalk.dim('  • Cost-effective for most use cases'));
  } else {
    console.log(chalk.bold('🐳 Container'));
    console.log(
      chalk.dim('Your agent will run in a dedicated container with:'),
    );
    console.log(chalk.dim('  • Larger compute footprint'));
    console.log(
      chalk.dim('  • Better performance for resource-intensive tasks'),
    );
    console.log(chalk.dim('  • Consistent isolated environment'));
    console.log('\n' + chalk.blue('📚 Learn more about container deployment:'));
    console.log(
      chalk.underline.blue(
        'https://docs.xpander.ai/API%20reference/cli-reference#cloud-deployment-container-management',
      ),
    );
  }
  console.log('');

  const createSpinner = ora(
    `Creating agent "${agentDetails.agentName}"...`,
  ).start();
  try {
    const newAgent = await client.createAgent(
      agentDetails.agentName,
      agentDetails.deploymentType,
    );

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
