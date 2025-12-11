import { spawn } from 'child_process';
import axios from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { getAgentIdFromEnvOrSelection } from '../../../utils/agent-resolver';
import { BillingErrorHandler } from '../../../utils/billing-error';
import { createClient } from '../../../utils/client';
import { getApiKey, getOrganizationId } from '../../../utils/config';
import {
  canUseLocalHandler,
  getPythonCommand,
} from '../../../utils/local-handler';

/**
 * Register invoke command for agents
 */
export function registerInvokeCommand(agentCmd: Command): void {
  agentCmd
    .command('invoke [agent] [message...]')
    .description('Invoke agent with a message and return the result')
    .addHelpText(
      'after',
      `
Examples:
  $ xpander agent invoke                          # Interactive: select agent and enter message
  $ xpander agent invoke "MyAgent"                # Select agent, then prompt for message
  $ xpander agent invoke "MyAgent" "Hello world"  # Direct invocation (uses API by default)
  $ xpander agent invoke --json MyAgent "task"    # Get JSON response
  $ xpander agent invoke --local MyAgent "task"   # Use local handler
  $ xpander agent invoke --webhook MyAgent "task" # Use webhook invocation`,
    )
    .option('--agent <agent>', 'Agent name or ID to invoke')
    .option('--agent-id <agent_id>', 'Agent ID to invoke')
    .option('--agent-name <agent_name>', 'Agent name to invoke')
    .option('--profile <name>', 'Profile to use')
    .option('--json', 'Output raw JSON response')
    .option('--local', 'Use local handler (xpander_handler.py)')
    .option('--api', 'Use API invocation (default)')
    .option('--webhook', 'Use webhook invocation')
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

        // Handle different invocation patterns:
        // 1. xpander agent invoke -> interactive agent selection + prompt for message
        // 2. xpander agent invoke "agent" -> resolve agent + prompt for message
        // 3. xpander agent invoke "agent" "message" -> resolve agent + use message

        let agentId: string | null = null;
        let useSilentMode = false;

        if (agentInput) {
          // Agent provided - resolve it
          useSilentMode = true;

          const spinner = ora('Resolving agent...').start();
          spinner.stop(); // Stop before potential interactive prompts

          agentId = await getAgentIdFromEnvOrSelection(
            client,
            agentInput,
            false, // Allow interactive prompts for duplicate names
          );

          if (!agentId) {
            console.error(
              chalk.red(`❌ Could not find agent: "${agentInput}"`),
            );
            console.log(
              chalk.yellow('Run "xpander agent list" to see available agents'),
            );
            process.exit(1);
          }
        } else {
          // No agent provided - interactive selection
          console.log(chalk.hex('#743CFF')('🤖 Agent Invocation'));
          console.log('');

          agentId = await getAgentIdFromEnvOrSelection(
            client,
            undefined,
            false, // Interactive mode
          );

          if (!agentId) {
            console.error(chalk.red('❌ No agent selected'));
            process.exit(1);
          }
        }

        // If no message was provided, prompt for it now
        if (!message) {
          console.log(''); // Add some spacing
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

        // Determine invocation mode: local, api, or webhook
        const useLocal = options.local;
        const useWebhook = options.webhook;
        const useApi = options.api || (!useLocal && !useWebhook); // Default to API

        // Get agent details for display
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

        // LOCAL HANDLER INVOCATION
        if (useLocal) {
          // Check if local handler is available
          if (!canUseLocalHandler()) {
            console.error(chalk.red('❌ Local handler not available'));
            console.log(
              chalk.yellow(
                'Make sure xpander_handler.py exists in the current directory',
              ),
            );
            process.exit(1);
          }
          // Use local handler
          console.log(chalk.cyan('🏠 Using local handler: xpander_handler.py'));

          try {
            const pythonCmd = getPythonCommand();
            const startTime = Date.now();

            console.log(chalk.cyan('🚀 Starting local handler execution...'));
            console.log('');

            // Execute local handler with streaming output
            const child = spawn(
              pythonCmd,
              ['xpander_handler.py', '--invoke', '--prompt', message],
              {
                cwd: process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe'],
              },
            );

            let output = '';
            let hasOutput = false;

            // Stream stdout in real-time
            child.stdout.on('data', (data) => {
              const text = data.toString();
              output += text;
              hasOutput = true;
              // Print each line as it comes
              process.stdout.write(text);
            });

            // Stream stderr in real-time (keep original colors)
            child.stderr.on('data', (data) => {
              const text = data.toString();
              output += text;
              hasOutput = true;
              // Print stderr as-is (don't force red color)
              process.stderr.write(text);
            });

            // Wait for process to complete
            const exitCode = await new Promise((resolve) => {
              child.on('close', (code) => {
                resolve(code);
              });
            });

            const responseTime = Date.now() - startTime;

            if (exitCode === 0) {
              console.log('');
              console.log(
                chalk.green('✅ Local handler completed successfully'),
              );
              console.log(chalk.dim(`Response time: ${responseTime}ms`));

              if (options.json && hasOutput) {
                // Try to extract JSON from the output
                const jsonMatch = output.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  try {
                    const jsonResult = JSON.parse(jsonMatch[0]);
                    console.log('\n' + chalk.blue('📄 JSON Response:'));
                    console.log(JSON.stringify(jsonResult, null, 2));
                  } catch {
                    console.log(
                      '\n' +
                        chalk.yellow('⚠️  Could not parse JSON from output'),
                    );
                  }
                }
              }
            } else {
              console.log('');
              console.log(
                chalk.red(`❌ Local handler failed with exit code ${exitCode}`),
              );
              throw new Error(`Process exited with code ${exitCode}`);
            }

            return; // Exit early after local invocation
          } catch (localError: any) {
            console.log(
              chalk.red('❌ Local handler failed:'),
              localError.message,
            );
            process.exit(1);
          }
        }

        // API INVOCATION (DEFAULT)
        if (useApi) {
          console.log(chalk.cyan('🔌 Using API invocation'));

          try {
            const orgId = getOrganizationId(options.profile);
            const apiUrl = `https://api.xpander.ai/v1/agents/${agentId}/invoke`;

            invokeSpinner = ora(`Invoking agent with: "${message}"...`).start();
            const startTime = Date.now();

            const response = await axios.post(
              apiUrl,
              {
                input: {
                  text: message,
                },
              },
              {
                headers: {
                  'x-api-key': apiKey,
                  'x-organization-id': orgId,
                  'Content-Type': 'application/json',
                },
                timeout: 60000,
              },
            );

            const responseTime = Date.now() - startTime;
            invokeSpinner.succeed('Response received');

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
                console.log(JSON.stringify(response.data, null, 2));
              }

              console.log(chalk.dim('─'.repeat(50)));
              console.log('');
              console.log(chalk.dim(`Response time: ${responseTime}ms`));
            }
            return; // Exit after API invocation
          } catch (apiError: any) {
            if (invokeSpinner) {
              invokeSpinner.fail('Failed to invoke agent');
            }

            const isStaging = process?.env?.IS_STG === 'true';
            if (BillingErrorHandler.handleIfBillingError(apiError, isStaging)) {
              process.exit(1);
            }

            if (apiError.response?.status === 404) {
              console.error(chalk.red('❌ Agent not found'));
              console.log(chalk.yellow('Make sure the agent ID is correct'));
            } else if (apiError.response?.status === 401) {
              console.error(chalk.red('❌ Invalid API key'));
              console.log(
                chalk.yellow(
                  'Run `xpander configure` to update your credentials',
                ),
              );
            } else if (apiError.code === 'ECONNABORTED') {
              console.error(
                chalk.red(
                  '❌ Request timeout - agent took too long to respond',
                ),
              );
            } else {
              console.error(chalk.red('❌ API invocation failed:'));
              console.error(apiError.response?.data || apiError.message);
            }
            process.exit(1);
          }
        }

        // WEBHOOK INVOCATION
        if (useWebhook) {
          console.log(chalk.cyan('🌐 Using webhook invocation'));

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
            return; // Exit after webhook invocation
          } catch (webhookError: any) {
            if (invokeSpinner) {
              invokeSpinner.fail('Failed to invoke agent');
            }

            // Check for 429 billing error first
            const isStaging = process?.env?.IS_STG === 'true';
            if (
              BillingErrorHandler.handleIfBillingError(webhookError, isStaging)
            ) {
              process.exit(1);
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
                chalk.red(
                  '❌ Request timeout - agent took too long to respond',
                ),
              );
            } else {
              console.error(chalk.red('❌ Webhook invocation failed:'));
              console.error(
                webhookError.response?.data || webhookError.message,
              );
            }
            process.exit(1);
          }
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Error invoking agent:'), error.message);
        process.exit(1);
      }
    });
}
