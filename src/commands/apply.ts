import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { CommandType } from '../types';
import { createClient } from '../utils/client';
import { applyManifest } from '../utils/manifest/applier';
import { loadManifest } from '../utils/manifest/parser';
import { renderManifestHeader, renderPlan } from '../utils/manifest/renderer';

const DEFAULT_FILE = 'xpander.yaml';

export function configureApplyCommand(program: Command): Command {
  const cmd = program
    .command(`${CommandType.Apply} [file]`)
    .description(
      'Apply a declarative xpander.yaml manifest (kubectl-style). Renders a plan and reconciles the agent.',
    )
    .option(
      '-f, --file <file>',
      'Manifest file (defaults to xpander.yaml in cwd)',
    )
    .option('--dry-run', 'Render plan only; do not reconcile')
    .option(
      '--live',
      'Call the xpander API to create/update the agent (default is simulation)',
    )
    .option('--yes', 'Skip confirmation prompt')
    .option('--profile <n>', 'Profile to use')
    .action(async (fileArg: string | undefined, options) => {
      const filePath = await resolveManifestPath(options.file || fileArg);
      if (!filePath) return;

      const manifest = await loadManifest(filePath);

      renderManifestHeader(manifest);
      renderPlan(manifest);

      if (options.dryRun) {
        console.log('');
        console.log(chalk.dim('Dry run — nothing was applied.'));
        return;
      }

      if (!options.yes && process.env.XPANDER_NON_INTERACTIVE !== 'true') {
        console.log('');
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: options.live
              ? 'Apply manifest (live — will call xpander API)?'
              : 'Apply manifest?',
            default: true,
          },
        ]);
        if (!confirm) {
          console.log(chalk.dim('Aborted.'));
          return;
        }
      }

      const client = options.live ? createClient(options.profile) : undefined;

      await applyManifest(manifest, { live: !!options.live, client });
    });

  return cmd;
}

async function resolveManifestPath(
  input: string | undefined,
): Promise<string | null> {
  const candidate = path.resolve(input ?? DEFAULT_FILE);
  try {
    const stat = await fs.stat(candidate);
    if (stat.isFile()) return candidate;
    console.error(chalk.red(`Not a file: ${candidate}`));
    return null;
  } catch {
    console.error(
      chalk.red(`Manifest not found: ${candidate}`),
      chalk.dim(
        `\n  Provide a path with -f <file> or run in a directory containing ${DEFAULT_FILE}`,
      ),
    );
    return null;
  }
}
