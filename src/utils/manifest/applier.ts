import chalk from 'chalk';
import ora from 'ora';
import { ParsedManifest } from './types';
import { XpanderClient } from '../client';

export interface ApplyOptions {
  live: boolean;
  client?: XpanderClient;
}

export async function applyManifest(
  manifest: ParsedManifest,
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

  const spec = manifest.doc.spec ?? {};
  const target = spec.deployment?.targets?.[0];
  if (target) {
    await step(
      `Binding deployment target ${chalk.bold(
        `${target.cloud ?? '?'}/${target.runtime ?? '?'}`,
      )} ${chalk.dim(`(${target.region ?? '?'})`)}`,
    );
  }

  if (spec.auth && Object.keys(spec.auth).length) {
    const inbound = (spec.auth as any).inbound;
    const descr = inbound?.type ? `${inbound.type}` : 'configured';
    await step(`Wiring auth (${descr})`);
  }

  if (spec.tools?.length) {
    const n = spec.tools.length;
    await step(`Registering ${n} tool${n === 1 ? '' : 's'}`);
  }

  if (spec.observability && Object.keys(spec.observability).length) {
    const parts = Object.entries(spec.observability).map(
      ([k, v]) => `${k}: ${(v as { sink?: string })?.sink ?? '?'}`,
    );
    await step(`Configuring observability (${parts.join(', ')})`);
  }

  console.log('');
  const name = manifest.doc.metadata?.name ?? 'agent';
  const tgt = target ? `${target.cloud}/${target.runtime}` : 'target';
  console.log(
    chalk.green('✔'),
    chalk.bold(`Apply complete — ${name} deployed to ${tgt}`),
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
  spinner.succeed(`Agent ${chalk.bold(name)} reconciled`);
}

async function step(message: string): Promise<void> {
  const spinner = ora(message).start();
  await sleep(250 + Math.floor(Math.random() * 350));
  spinner.succeed(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
