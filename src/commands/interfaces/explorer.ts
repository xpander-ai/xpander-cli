import * as fs from 'fs';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { AgenticOperation } from '../../types/agent/operation';
import { createClient } from '../../utils/client';
import { getApiKey } from '../../utils/config';

// HTTP method color mapping
const methodColors: Record<string, any> = {
  GET: chalk.green,
  POST: chalk.blue,
  PUT: chalk.yellow,
  DELETE: chalk.red,
  PATCH: chalk.magenta,
  OPTIONS: chalk.cyan,
  HEAD: chalk.gray,
  default: chalk.white,
};

// Get color for HTTP method
const getMethodColor = (method: string) => {
  const colorFunc = methodColors[method?.toUpperCase()] || methodColors.default;
  return colorFunc;
};

// Generate badge for HTTP method
const getMethodBadge = (method: string) => {
  const colorFunc = getMethodColor(method);
  const paddedMethod = method.toUpperCase().padEnd(6, ' ');
  return colorFunc.bold(` ${paddedMethod} `);
};

/**
 * Enhanced interactive interfaces explorer
 */
export async function exploreInterfaces() {
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
    console.log(chalk.bold.cyan('🚀 Xpander Tools Explorer'));
    console.log(chalk.dim('═'.repeat(60)));
    console.log(
      chalk.blue('Discover, Connect, and Manage your AI Agent Operations'),
    );
    console.log(chalk.dim('═'.repeat(60)));

    const client = createClient();

    // Load all interfaces at startup for faster UX
    const spinner = ora({
      text: 'Loading interfaces...',
      spinner: 'dots',
    }).start();

    // Fetch all interfaces
    const interfaces = await client.getAgenticInterfaces();

    spinner.succeed('Interfaces loaded successfully');

    if (!interfaces || interfaces.length === 0) {
      console.log(chalk.yellow('\nNo interfaces found in your account.'));
      return;
    }

    let exitRequested = false;
    while (!exitRequested) {
      // Show interface selection
      const { selectedInterface } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedInterface',
          message: 'Select an interface:',
          choices: [
            ...interfaces.map((iface) => ({
              name: `${chalk.cyan(iface.name)} ${chalk.dim(`(${iface.id.substring(0, 8)}...)`)}`,
              value: iface,
              short: iface.name,
            })),
            { name: 'Exit', value: 'exit' },
          ],
          pageSize: 15,
        },
      ]);

      if (selectedInterface === 'exit') {
        console.log(chalk.blue('\nExiting interface explorer. Goodbye!'));
        return;
      }

      // Show interface details
      console.log('');
      console.log(chalk.bold.cyan(`Interface: ${selectedInterface.name}`));
      console.log(chalk.dim(`ID: ${selectedInterface.id}`));
      if (selectedInterface.description) {
        console.log(chalk.white(selectedInterface.description));
      }
      console.log('');

      // Fetch operations
      const operationsSpinner = ora('Loading operations...').start();
      try {
        const operations = await client.getAgenticOperations(
          selectedInterface.id,
        );

        if (operations.length === 0) {
          operationsSpinner.warn('No operations found for this interface');
          console.log(
            chalk.yellow(
              'This interface has no operations defined or they are not accessible.',
            ),
          );
        } else {
          operationsSpinner.succeed(`Found ${operations.length} operations`);

          // Display operations with multi-select
          const { selectedOps } = await inquirer.prompt([
            {
              type: 'checkbox',
              name: 'selectedOps',
              message:
                'Select operations to use (space to select, enter to confirm):',
              choices: operations.map((op) => {
                // Create a rich display with method badge and name
                const displayMethod = op.method
                  ? getMethodBadge(op.method)
                  : '';
                return {
                  name: `${displayMethod} ${chalk.bold(op.name)}`,
                  value: op,
                  short: op.name,
                };
              }),
              pageSize: 15,
            },
          ]);

          if (selectedOps.length === 0) {
            console.log(chalk.yellow('No operations selected.'));
          } else {
            console.log(
              chalk.green(`\nSelected ${selectedOps.length} operation(s):\n`),
            );

            selectedOps.forEach((op: AgenticOperation, index: number) => {
              console.log(chalk.bold.white(`${index + 1}. ${op.name}`));
              if (op.method) {
                console.log(
                  getMethodBadge(op.method),
                  chalk.dim(op.path || ''),
                );
              }

              // Show detailed view
              if (op.summary) {
                console.log(chalk.white('Summary:'));
                console.log(chalk.dim(op.summary));
              }

              console.log(chalk.dim('ID: ') + chalk.gray(op.id));
              console.log('');
            });

            // Display selected operations schema with more detailed information
            console.log(chalk.bold.cyan('\nSelected Operations Schema:'));
            console.log(chalk.dim('─'.repeat(60)));

            // Use the raw operation schema directly from the API
            // This ensures we capture the complete schema definition
            console.log(chalk.cyan('Extracting complete operation schemas...'));

            // Ask if user wants to see detailed debug information
            const { showDebugInfo } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'showDebugInfo',
                message:
                  'Would you like to see the detailed operation schema structure?',
                default: false,
              },
            ]);

            // We'll add the interface information to each operation
            const operationsSchema = selectedOps.map((op: any) => {
              // Keep the original operation object intact
              return {
                ...op,
                // Add interface reference
                interface: {
                  id: selectedInterface.id,
                  name: selectedInterface.name,
                },
              };
            });

            // Examine the operations to find all available properties
            if (selectedOps.length > 0) {
              if (showDebugInfo) {
                // Display the first operation's complete structure
                console.log(
                  chalk.bold.yellow(
                    '\nComplete Operation Structure (first operation):',
                  ),
                );
                console.log(JSON.stringify(selectedOps[0], null, 2));

                // Collect all keys across all operations to show what fields are available
                const allKeys = new Set<string>();
                selectedOps.forEach((op: any) => {
                  Object.keys(op).forEach((key) => allKeys.add(key));
                });

                console.log(
                  chalk.bold.yellow('\nAll Available Schema Properties:'),
                );
                console.log(JSON.stringify(Array.from(allKeys), null, 2));

                // Include a separator for clarity
                console.log(chalk.dim('─'.repeat(60)));
              }
            }

            // Display the schema in a readable format
            operationsSchema.forEach((schema: any, index: number) => {
              const methodColor = getMethodColor(schema.method);

              console.log(chalk.bold.white(`${index + 1}. ${schema.name}`));
              console.log(
                methodColor(`${schema.method.toUpperCase()} ${schema.path}`),
              );
              console.log(chalk.dim(`ID: ${schema.id}`));

              if (schema.summary) {
                console.log(chalk.white('\nSummary:'));
                console.log(chalk.dim(schema.summary));
              }

              if (schema.description) {
                console.log(chalk.white('\nDescription:'));
                console.log(chalk.dim(schema.description));
              }

              if (schema.parameters && schema.parameters.length > 0) {
                console.log(chalk.white('\nParameters:'));
                schema.parameters.forEach((param: any) => {
                  console.log(
                    chalk.dim(
                      `- ${param.name} (${param.in || 'unknown'}): ${param.description || 'No description'}`,
                    ),
                  );
                  if (param.required) {
                    console.log(chalk.red.dim('  Required: true'));
                  }
                  if (param.schema) {
                    console.log(
                      chalk.dim(`  Type: ${param.schema.type || 'unknown'}`),
                    );
                  }
                });
              }

              console.log(chalk.dim('\nInterface:'));
              console.log(
                chalk.dim(
                  `- ${schema.interface.name} (${schema.interface.id})`,
                ),
              );

              // Show all available property keys in the schema
              console.log(chalk.cyan('\nAvailable Schema Properties:'));
              const schemaKeys = Object.keys(schema).filter(
                (key) => key !== 'interface',
              );
              console.log(chalk.dim(schemaKeys.join(', ')));

              // If there's an OpenAPI schema or specific schema definition, show it
              if (schema.schema) {
                console.log(chalk.cyan('\nAPI Schema Definition:'));
                console.log(
                  chalk.dim('Schema available - will be saved to JSON file'),
                );
              }

              if (schema.requestSchema) {
                console.log(chalk.cyan('\nRequest Schema:'));
                console.log(
                  chalk.dim(
                    'Request schema available - will be saved to JSON file',
                  ),
                );
              }

              if (schema.responseSchema) {
                console.log(chalk.cyan('\nResponse Schema:'));
                console.log(
                  chalk.dim(
                    'Response schema available - will be saved to JSON file',
                  ),
                );
              }

              console.log(chalk.dim('─'.repeat(60)));
            });

            // Ask if user wants to save the schema to a file
            const { saveToFile } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'saveToFile',
                message:
                  'Would you like to save these operations schema to a file?',
                default: false,
              },
            ]);

            if (saveToFile) {
              const { saveOptions } = await inquirer.prompt([
                {
                  type: 'list',
                  name: 'saveOptions',
                  message: 'How would you like to save the schema?',
                  choices: [
                    {
                      name: 'Save complete raw schema (recommended)',
                      value: 'complete',
                    },
                    {
                      name: 'Save minimal schema (basic properties only)',
                      value: 'minimal',
                    },
                  ],
                  default: 'complete',
                },
              ]);

              const { fileName } = await inquirer.prompt([
                {
                  type: 'input',
                  name: 'fileName',
                  message: 'Enter a file name (without extension):',
                  default: `operations-schema-${Date.now()}`,
                  validate: (input) => {
                    if (!input) return 'File name cannot be empty';
                    if (input.includes('/') || input.includes('\\'))
                      return 'File name cannot contain slashes';
                    return true;
                  },
                },
              ]);

              // Create file path
              const filePath = `${fileName}.json`;

              try {
                // Determine what to save based on user choice
                let dataToSave;

                if (saveOptions === 'minimal') {
                  // Create a minimized version with just the essential properties
                  dataToSave = selectedOps.map((op: any) => ({
                    name: op.name,
                    id: op.id,
                    method: op.method || 'UNKNOWN',
                    path: op.path || '',
                    summary: op.summary || '',
                    description: op.description || '',
                    interface: {
                      id: selectedInterface.id,
                      name: selectedInterface.name,
                    },
                  }));
                } else {
                  // Save the complete raw schema with all original properties
                  // Using direct selectedOps array to preserve all original API properties
                  dataToSave = selectedOps.map((op: any) => ({
                    ...op, // Include all original API properties
                    // Add interface reference that wasn't in the original
                    interface: {
                      id: selectedInterface.id,
                      name: selectedInterface.name,
                    },
                  }));
                }

                // Write to file
                fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
                console.log(
                  chalk.green.bold(
                    `\n✓ Successfully saved operations schema to ${filePath}`,
                  ),
                );

                // Provide additional feedback
                if (saveOptions === 'complete') {
                  console.log(
                    chalk.green(
                      'Full API schema saved with all available properties and definitions.',
                    ),
                  );

                  // Show what properties were included
                  if (dataToSave.length > 0) {
                    const propNames = Object.keys(dataToSave[0]).filter(
                      (k) => k !== 'interface',
                    );
                    console.log(
                      chalk.cyan('\nSchema includes these properties:'),
                    );
                    console.log(chalk.dim(propNames.join(', ')));
                  }
                } else {
                  console.log(
                    chalk.yellow(
                      'Minimal schema saved with basic properties only.',
                    ),
                  );
                }

                console.log(
                  chalk.dim(
                    'You can use this schema to configure your application.',
                  ),
                );
              } catch (error) {
                console.error(
                  chalk.red.bold(`\n❌ Error saving schema to file: ${error}`),
                );
              }
            }

            // Ask if they want to continue
            const { continueExploring } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'continueExploring',
                message: 'Would you like to explore another interface?',
                default: true,
              },
            ]);

            if (!continueExploring) {
              console.log(chalk.blue('\nExiting interface explorer. Goodbye!'));
              exitRequested = true;
            }
          }
        }
      } catch (error: any) {
        operationsSpinner.fail('Failed to load operations');
        console.error(chalk.red('Error: ') + chalk.white(String(error)));
      }
    }
  } catch (error: any) {
    console.error(
      chalk.red('Error in explorer:'),
      error.message || String(error),
    );
  }
}
