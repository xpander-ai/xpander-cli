import axios from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { getAgentIdFromEnvOrSelection } from '../../../utils/agent-resolver';
import { createClient } from '../../../utils/client';
import { getApiKey } from '../../../utils/config';

/**
 * Register invoke command for agents
 */
export function registerInvokeCommand(agentCmd: Command): void {
  agentCmd
    .command('invoke [agent] [message...]')
    .description('Invoke agent with a message and return the result')
    .option('--agent <agent>', 'Agent name or ID to invoke')
    .option('--agent-id <agent_id>', 'Agent ID to invoke')
    .option('--agent-name <agent_name>', 'Agent name to invoke')
    .option('--profile <name>', 'Profile to use')
    .option('--json', 'Output raw JSON response')
    .action(async (agentArg, messageArgs, options) => {
      try {
        const apiKey = getApiKey(options.profile);
        if (!apiKey) {
          console.error(
            chalk.red(
              'No API key found. Please run `xpander configure` first.',
            ),
          );
          process.exit(1);
        }

        const client = createClient(options.profile);

        // Handle agent and message parsing
        let agentInput: string | undefined;
        let message: string;

        // Check if we have explicit agent flags (old syntax)
        if (options.agent || options.agentId || options.agentName) {
          // Old syntax: flags specify agent, all positional args are message
          agentInput = options.agent || options.agentId || options.agentName;
          const allMessageParts = [];
          if (agentArg) allMessageParts.push(agentArg);
          if (Array.isArray(messageArgs)) {
            allMessageParts.push(...messageArgs);
          } else if (messageArgs) {
            allMessageParts.push(messageArgs);
          }
          message = allMessageParts.join(' ').trim();
        } else {
          // New syntax: first arg is agent, rest is message
          agentInput = agentArg;
          message = Array.isArray(messageArgs)
            ? messageArgs.join(' ').trim()
            : (messageArgs || '').trim();
        }

        // If no message and no agent, we'll handle this after agent selection
        // If we have an agent but no message, that's an error
        if (!message && agentInput) {
          console.error(chalk.red('❌ Message is required'));
          console.log(
            chalk.yellow('Usage: xpander agent invoke [agent] "message"'),
          );
          process.exit(1);
        }

        // Start spinner for fetching agent details
        const spinner = ora('Fetching agent details...').start();

        // Temporarily stop spinner before agent resolution (which may print messages)
        spinner.stop();

        // Use silent mode only if agent is explicitly provided, otherwise allow interactive selection
        const useSilentMode = !!agentInput;
        const agentId = await getAgentIdFromEnvOrSelection(
          client,
          agentInput,
          useSilentMode,
        );

        if (!agentId) {
          console.error(chalk.red('❌ Could not determine agent to invoke'));
          process.exit(1);
        }

        // If no message was provided, prompt for it now
        if (!message) {
          const { userMessage } = await inquirer.prompt([
            {
              type: 'input',
              name: 'userMessage',
              message: 'Enter your message:',
              validate: (input) => {
                if (!input.trim()) {
                  return 'Message cannot be empty';
                }
                return true;
              },
            },
          ]);
          message = userMessage.trim();
        }

        // Get agent details for display and webhook URL
        const agentDetails = await client.getAgentWebhookDetails(agentId);

        // Show using agent message with checkmark only if we used silent mode
        if (useSilentMode) {
          console.log(
            chalk.green('✔') +
              ' ' +
              chalk.hex('#743CFF')(
                `Using agent: ${agentDetails.name} (${agentId})`,
              ),
          );
        }

        let invokeSpinner: any;

        try {
          const webhookUrl =
            agentDetails.webhook_url ||
            `https://webhook.xpander.ai/?agent_id=${agentId}&asynchronous=false`;

          // Start spinner for webhook call
          invokeSpinner = ora(`Invoking agent with: "${message}"...`).start();

          // Start timing from webhook call
          const startTime = Date.now();

          const response = await axios.post(
            webhookUrl,
            {
              message: message,
            },
            {
              headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
              },
              timeout: 60000, // 60 second timeout
            },
          );

          const responseTime = Date.now() - startTime;
          invokeSpinner.succeed('Response received');

          // Display results
          if (options.json) {
            console.log(JSON.stringify(response.data, null, 2));
          } else {
            console.log('\n' + chalk.blue('🤖 Agent Response:'));
            console.log(chalk.dim('─'.repeat(50)));

            if (response.data.result) {
              console.log(response.data.result);
            } else if (response.data.response) {
              console.log(response.data.response);
            } else if (response.data.message) {
              console.log(response.data.message);
            } else if (typeof response.data === 'string') {
              console.log(response.data);
            } else {
              // Fallback to pretty JSON if structure is unknown
              console.log(JSON.stringify(response.data, null, 2));
            }

            console.log(chalk.dim('─'.repeat(50)));

            // Display response time
            console.log('');
            console.log(chalk.dim(`Response time: ${responseTime}ms`));
          }
        } catch (webhookError: any) {
          if (invokeSpinner) {
            invokeSpinner.fail('Failed to invoke agent');
          } else {
            spinner.fail('Failed to get agent details');
          }

          if (webhookError.response?.status === 404) {
            console.error(chalk.red('❌ Agent webhook not found'));
            console.log(
              chalk.yellow('Make sure the agent is properly configured'),
            );
          } else if (webhookError.response?.status === 401) {
            console.error(chalk.red('❌ Invalid API key'));
            console.log(
              chalk.yellow(
                'Run `xpander configure` to update your credentials',
              ),
            );
          } else if (webhookError.code === 'ECONNABORTED') {
            console.error(
              chalk.red('❌ Request timeout - agent took too long to respond'),
            );
          } else {
            console.error(chalk.red('❌ Webhook invocation failed:'));
            console.error(webhookError.response?.data || webhookError.message);
          }
          process.exit(1);
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Error invoking agent:'), error.message);
        process.exit(1);
      }
    });
}
