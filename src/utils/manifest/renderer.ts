import boxen from 'boxen';
import chalk from 'chalk';
import { ParsedManifest } from './types';

const XPANDER_PURPLE = '#743CFF';

export function renderManifestHeader(manifest: ParsedManifest): void {
  const { doc } = manifest;
  const name = doc.metadata?.name ?? '(unnamed)';
  const kind = doc.kind ?? 'Agent';
  const apiVersion = doc.apiVersion ?? 'xpander.ai/v1';

  const title = `${chalk.hex(XPANDER_PURPLE)('xpander apply')} • ${chalk.bold(
    kind,
  )} ${chalk.dim('·')} ${chalk.cyan(name)}`;

  const lines: string[] = [title, '', chalk.dim(`apiVersion: ${apiVersion}`)];
  if (doc.metadata?.description) {
    lines.push(
      chalk.dim(
        doc.metadata.description.trim().split('\n').slice(0, 2).join(' '),
      ),
    );
  }

  console.log(
    boxen(lines.join('\n'), {
      padding: 1,
      margin: { top: 1, right: 0, bottom: 0, left: 2 },
      borderStyle: 'round',
      borderColor: XPANDER_PURPLE,
    }),
  );
}

export function renderPlan(manifest: ParsedManifest): void {
  const spec = manifest.doc.spec ?? {};
  console.log('');
  console.log(chalk.bold.hex(XPANDER_PURPLE)('PLAN'));
  console.log(chalk.dim('─'.repeat(60)));

  const rows: Array<[string, string]> = [];

  if (spec.development) {
    rows.push([
      'development',
      `${spec.development.framework ?? '-'} · ${
        spec.development.language ?? '-'
      } · ${spec.development.entrypoint ?? '-'}`,
    ]);
  }

  const targets = spec.deployment?.targets ?? [];
  for (const t of targets) {
    rows.push([
      'deploy target',
      `${chalk.bold(t.cloud ?? '?')}/${t.runtime ?? '?'} ${chalk.dim(
        `(${t.region ?? '?'})`,
      )}`,
    ]);
  }

  if (spec.model) rows.push(['model', spec.model]);
  if (spec.tools?.length) {
    rows.push(['tools', spec.tools.map((t) => t.name).join(', ')]);
  }
  if (spec.auth && Object.keys(spec.auth).length) {
    rows.push(['auth', describeAuth(spec.auth)]);
  }
  if (spec.observability && Object.keys(spec.observability).length) {
    rows.push(['observability', describeObservability(spec.observability)]);
  }

  const width = Math.max(...rows.map(([k]) => k.length), 10);
  for (const [k, v] of rows) {
    console.log(`  ${chalk.green('+')} ${k.padEnd(width)}  ${v}`);
  }
}

function describeAuth(auth: Record<string, unknown>): string {
  const inbound = (auth.inbound ?? {}) as Record<string, unknown>;
  const parts: string[] = [];
  if (inbound.type) parts.push(`inbound=${inbound.type as string}`);
  if (inbound.audience) parts.push('jwt-audience');
  return parts.join(' · ') || JSON.stringify(auth);
}

function describeObservability(obs: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obs)) {
    const sink = (v as { sink?: string })?.sink;
    parts.push(`${k}=${sink ?? '?'}`);
  }
  return parts.join(' · ');
}
