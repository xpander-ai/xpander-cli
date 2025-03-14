import chalk from 'chalk';

/**
 * Helper function to colorize agent status
 */
export function colorizeStatus(status?: string): string {
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
