import chalk from 'chalk';
import ora from 'ora';
import { statusColor, statusLabel } from './renderer';
import { CoverageReport, ParsedManifest, RfpStatus } from './types';
import { XpanderClient } from '../client';

export interface ApplyOptions {
  live: boolean;
  client?: XpanderClient;
}

export async function applyManifest(
  manifest: ParsedManifest,
  report: CoverageReport,
  opts: ApplyOptions,
): Promise<void> {
  console.log('');
  console.log(chalk.bold.hex('#743CFF')('APPLY'));
  console.log(chalk.dim('─'.repeat(60)));

  if (opts.live && opts.client) {
    await applyAgentLive(manifest, opts.client);
  } else {
    await simulateAgentCreation(manifest);
  }

  for (const bucket of report.buckets) {
    if (bucket.covered.length === 0) continue;
    for (const req of bucket.covered) {
      await reconcileRequirement(
        req.id,
        req.name,
        req.status,
        bucket.bucket.code,
      );
    }
  }

  const gaps = report.buckets.filter(
    (b) => b.declaredUncovered && b.covered.length === 0,
  );
  if (gaps.length) {
    console.log('');
    console.log(chalk.dim('Declared manifest gaps (not reconciled):'));
    for (const g of gaps) {
      console.log(
        `  ${chalk.gray('○')} ${g.bucket.code} ${chalk.dim(
          g.bucket.name,
        )} ${chalk.dim(`(${g.bucket.requirements.length} requirements)`)}`,
      );
    }
  }

  console.log('');
  console.log(
    chalk.green('✔'),
    chalk.bold(
      `Apply complete — ${report.totalCovered}/${report.totalRequirements} requirements reconciled`,
    ),
  );
}

async function applyAgentLive(
  manifest: ParsedManifest,
  client: XpanderClient,
): Promise<void> {
  const name = manifest.doc.metadata?.name ?? 'declarative-demo-agent';
  const type = manifest.doc.spec?.deployment?.type ?? 'container';

  const spinner = ora(`Reconciling agent "${name}" via xpander API`).start();
  try {
    const agent = await client.createAgent(name, type as any);
    spinner.succeed(
      `Agent ${chalk.bold(agent?.name ?? name)} reconciled ${chalk.dim(
        `(id: ${agent?.id ?? '-'})`,
      )}`,
    );
  } catch (err: any) {
    spinner.warn(
      `Live reconcile skipped: ${
        err?.message ?? String(err)
      } — falling back to simulation`,
    );
    await simulateAgentCreation(manifest);
  }
}

async function simulateAgentCreation(manifest: ParsedManifest): Promise<void> {
  const name = manifest.doc.metadata?.name ?? 'declarative-demo-agent';
  const target = manifest.doc.spec?.deployment?.targets?.[0];
  const spinner = ora(
    `Reconciling agent "${name}" → ${target?.cloud ?? '?'}/${
      target?.runtime ?? '?'
    }`,
  ).start();
  await sleep(650);
  spinner.succeed(
    `Agent ${chalk.bold(name)} reconciled ${chalk.dim('(simulated)')}`,
  );
}

async function reconcileRequirement(
  id: string,
  name: string,
  status: RfpStatus,
  bucketCode: string,
): Promise<void> {
  const label = `${chalk.dim(bucketCode)} ${chalk.bold(id)} ${chalk.dim(name)}`;
  const spinner = ora(`${label}`).start();
  await sleep(80 + Math.floor(Math.random() * 180));
  const badge = statusColor(status)(`[${statusLabel(status)}]`);

  switch (status) {
    case 'supported':
      spinner.succeed(`${label} ${badge}`);
      break;
    case 'partial':
      spinner.warn(`${label} ${badge}`);
      break;
    case 'roadmap':
      spinner.info(`${label} ${badge} ${chalk.dim('deferred')}`);
      break;
    case 'guidance':
      spinner.info(`${label} ${badge} ${chalk.dim('requires config')}`);
      break;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
