import boxen from 'boxen';
import chalk from 'chalk';
import Table from 'cli-table3';
import { getCurrentProfile, getOrganizationId } from './config';
import { version } from '../../package.json';

/**
 * Displays the Xpander CLI banner
 */
export async function displayBanner(): Promise<void> {
  // Get the current profile - use environment variable if set for this command
  const currentProfile =
    process.env.XPANDER_CURRENT_PROFILE || getCurrentProfile();

  let orgId = '';

  try {
    orgId = getOrganizationId();
  } catch (error) {
    // Silently fail if we can't get org info
  }

  // Create colored versions for display
  const profileText = `Profile: ${chalk.cyan(currentProfile || 'default')}`;
  const metaText = [
    orgId ? `Org: ${chalk.gray(orgId)}` : '',
    chalk.gray(`v${version}`),
  ]
    .filter(Boolean)
    .join(' • ');

  // Simple branded banner
  const asciiArt = `${chalk.hex('#743CFF')('xpander.ai')} | ${chalk.white('Build better AI Agents faster')}

  ${profileText}
  ${metaText}`;

  console.log(
    boxen(asciiArt, {
      padding: 1,
      margin: { top: 0, right: 0, bottom: 0, left: 2 },
      borderStyle: 'round',
      borderColor: '#743CFF',
      titleAlignment: 'center',
    }),
  );
}

/**
 * Displays custom help format with cool styling
 */
export function displayCustomHelp(): void {
  console.log('');
  console.log(chalk.bold.hex('#743CFF')('USAGE'));
  console.log(chalk.dim('  xpander [command] [options]'));
  console.log(chalk.dim('  x [command] [options]'));
  console.log('');

  console.log(chalk.bold.hex('#743CFF')('COMMANDS'));
  console.log('');

  // Authentication commands
  console.log(chalk.hex('#743CFF')('  Authentication'));
  const authTable = new Table({
    chars: {
      top: '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      bottom: '',
      'bottom-mid': '',
      'bottom-left': '',
      'bottom-right': '',
      left: '  ',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      right: '',
      'right-mid': '',
    },
    style: { 'padding-left': 0, 'padding-right': 4, border: [], head: [] },
    colWidths: [35, 55],
  });
  authTable.push(
    [
      `${chalk.cyan('login')} ${chalk.dim('(l)')}`,
      'Authenticate with Xpander (opens browser)',
    ],
    [
      `${chalk.cyan('configure')} ${chalk.dim('(c)')}`,
      'Set up API credentials manually',
    ],
    [chalk.cyan('profile'), 'Switch between different Xpander accounts'],
  );
  console.log(authTable.toString());
  console.log('');

  // Agent Management commands
  console.log(chalk.hex('#743CFF')('  Agent Management'));
  const mgmtTable = new Table({
    chars: {
      top: '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      bottom: '',
      'bottom-mid': '',
      'bottom-left': '',
      'bottom-right': '',
      left: '  ',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      right: '',
      'right-mid': '',
    },
    style: { 'padding-left': 0, 'padding-right': 4, border: [], head: [] },
    colWidths: [35, 55],
  });
  mgmtTable.push(
    [
      `${chalk.cyan('agent new')} ${chalk.dim('(a n)')}`,
      'Create a new AI agent with interactive setup',
    ],
    [chalk.cyan('agent list'), 'Show all your agents and their status'],
    [
      `${chalk.cyan('agent init')} ${chalk.dim('(a i)')} ${chalk.green('[agent-id|agent-name]')}`,
      'Download agent files to current folder',
    ],
    [
      `${chalk.cyan('agent edit')} ${chalk.dim('(a e)')} ${chalk.green('[agent-id|agent-name]')}`,
      'Open agent configuration editor',
    ],
    [
      `${chalk.cyan('agent delete')} ${chalk.dim('(a del)')} ${chalk.green('[agent-id|agent-name]')}`,
      'Permanently remove agent and all data',
    ],
  );
  console.log(mgmtTable.toString());
  console.log('');

  // Agent Container Management commands
  console.log(chalk.hex('#743CFF')('  Agent Container Management'));
  const containerTable = new Table({
    chars: {
      top: '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      bottom: '',
      'bottom-mid': '',
      'bottom-left': '',
      'bottom-right': '',
      left: '  ',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      right: '',
      'right-mid': '',
    },
    style: { 'padding-left': 0, 'padding-right': 4, border: [], head: [] },
    colWidths: [35, 55],
  });
  containerTable.push(
    [
      `${chalk.cyan('agent deploy')} ${chalk.dim('(a d)')} ${chalk.green('[agent-id|agent-name]')}`,
      'Deploy agent to cloud (builds & runs instantly)',
    ],
    [
      `${chalk.cyan('agent logs')} ${chalk.dim('(a l)')} ${chalk.green('[agent-id|agent-name]')}`,
      'Stream real-time logs from deployed agent',
    ],
    [
      `${chalk.cyan('agent restart')} ${chalk.green('[agent-id|agent-name]')}`,
      'Restart deployed agent container',
    ],
    [
      `${chalk.cyan('agent stop')} ${chalk.green('[agent-id|agent-name]')}`,
      'Stop running agent container',
    ],
  );
  console.log(containerTable.toString());
  console.log('');

  // Other commands
  console.log(chalk.hex('#743CFF')('  Other'));
  const otherTable = new Table({
    chars: {
      top: '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      bottom: '',
      'bottom-mid': '',
      'bottom-left': '',
      'bottom-right': '',
      left: '  ',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      right: '',
      'right-mid': '',
    },
    style: { 'padding-left': 0, 'padding-right': 4, border: [], head: [] },
    colWidths: [35, 45],
  });
  otherTable.push(
    [
      `${chalk.cyan('agent dev')} ${chalk.green('[agent-id|agent-name]')}`,
      'Run agent locally for development & testing',
    ],
    [chalk.cyan('secrets-sync'), 'Upload .env variables to deployed agents'],
  );
  console.log(otherTable.toString());
  console.log('');

  // Examples in a box
  const examples = `${chalk.bold('Quick Start:')}
  x l                                        # xpander login
  x a n                                      # xpander agent new  
  x a d my-agent                             # xpander agent deploy
  x a l my-agent                             # xpander agent logs`;

  console.log(
    boxen(examples, {
      padding: 1,
      margin: { top: 0, right: 0, bottom: 0, left: 2 },
      borderStyle: 'round',
      borderColor: '#743CFF',
      title: chalk.hex('#743CFF')('Examples'),
      titleAlignment: 'center',
    }),
  );
}
