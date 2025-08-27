import chalk from 'chalk';
import Table from 'cli-table3';
import { colorizeStatus } from './format';

/**
 * Helper function to display agents in a table
 */
export function displayAgentTable(agents: any[]) {
  const table = new Table({
    head: [
      chalk.bold('ID'),
      chalk.bold('Name'),
      chalk.bold('Status'),
      chalk.bold('Deploy'),
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

    // Format deployment type with icon
    const deploymentType = agentEntry.deployment_type || 'serverless';
    const deploymentIcon = deploymentType === 'container' ? '🐳' : '🚀';
    const deploymentDisplay = `${deploymentIcon} ${deploymentType}`;

    table.push([
      chalk.dim(agentEntry.id),
      chalk.cyan(agentEntry.name),
      colorizeStatus(agentEntry.status),
      chalk.magenta(deploymentDisplay),
      chalk.yellow(agentEntry.model_name || ''),
      createdDate,
    ]);
  });

  console.log('\n' + table.toString() + '\n');
}
