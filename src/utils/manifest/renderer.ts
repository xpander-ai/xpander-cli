import boxen from 'boxen';
import chalk from 'chalk';
import Table from 'cli-table3';
import {
  BucketCoverage,
  CoverageReport,
  ParsedManifest,
  RfpRequirement,
  RfpStatus,
} from './types';

const BAR_WIDTH = 20;

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

export function renderCoverage(report: CoverageReport): void {
  console.log('');
  console.log(
    `${chalk.bold.hex(XPANDER_PURPLE)('RFP COVERAGE')} ${chalk.dim(
      '(Multi-Cloud Agent Platform evaluation matrix)',
    )}`,
  );
  console.log(chalk.dim('─'.repeat(60)));

  for (const b of report.buckets) {
    console.log(renderBucketLine(b));
  }

  console.log(chalk.dim('─'.repeat(60)));
  const summary = `${chalk.bold(
    `${report.totalCovered}/${report.totalRequirements}`,
  )} requirements declared · ${chalk.bold(
    `${report.overallPercent}%`,
  )} manifest coverage`;
  console.log(`  ${summary}`);
  console.log(
    `  ${chalk.dim('Legend:')} ${chalk.green('■ supported')}  ${chalk.yellow(
      '■ partial',
    )}  ${chalk.blue('■ roadmap')}  ${chalk.magenta(
      '■ guidance',
    )}  ${chalk.gray('□ not in manifest')}`,
  );
}

function renderBucketLine(b: BucketCoverage): string {
  const filled = Math.round((b.percent / 100) * BAR_WIDTH);
  const bar = buildStackedBar(b, filled);
  const label = `${b.bucket.code} ${chalk.dim(b.bucket.name)}`;
  const percent = chalk.bold(`${String(b.percent).padStart(3)}%`);
  const fraction = chalk.dim(
    `${b.covered.length}/${b.bucket.requirements.length}`,
  );
  const tag = b.declaredUncovered ? chalk.dim.italic('  (declared gap)') : '';
  return `  ${label.padEnd(44)}  ${bar}  ${percent}  ${fraction}${tag}`;
}

function buildStackedBar(b: BucketCoverage, filledCells: number): string {
  let out = '';
  const coveredByStatus = groupStatus(b.covered);
  const order: RfpStatus[] = ['supported', 'partial', 'roadmap', 'guidance'];
  let used = 0;
  for (const s of order) {
    if (used >= filledCells) break;
    const count = coveredByStatus[s] ?? 0;
    if (count === 0) continue;
    const share = Math.max(
      1,
      Math.round((count / Math.max(b.covered.length, 1)) * filledCells),
    );
    const cells = Math.min(share, filledCells - used);
    out += statusColor(s)('█'.repeat(cells));
    used += cells;
  }
  out += chalk.gray('░'.repeat(Math.max(0, BAR_WIDTH - used)));
  return out;
}

function groupStatus(reqs: RfpRequirement[]): Record<RfpStatus, number> {
  const acc: Record<RfpStatus, number> = {
    supported: 0,
    partial: 0,
    roadmap: 0,
    guidance: 0,
  };
  for (const r of reqs) acc[r.status]++;
  return acc;
}

export function statusColor(s: RfpStatus) {
  switch (s) {
    case 'supported':
      return chalk.green;
    case 'partial':
      return chalk.yellow;
    case 'roadmap':
      return chalk.blue;
    case 'guidance':
      return chalk.magenta;
  }
}

export function renderCoveredDetail(report: CoverageReport): void {
  console.log('');
  console.log(chalk.bold.hex(XPANDER_PURPLE)('COVERED REQUIREMENTS'));
  console.log(chalk.dim('─'.repeat(60)));

  const table = new Table({
    head: [chalk.dim('ID'), chalk.dim('Requirement'), chalk.dim('xpander')],
    style: { head: [], border: ['grey'] },
    colWidths: [10, 40, 18],
    wordWrap: true,
  });

  for (const b of report.buckets) {
    for (const r of b.covered) {
      table.push([r.id, r.name, statusColor(r.status)(statusLabel(r.status))]);
    }
  }

  if (table.length === 0) {
    console.log(chalk.dim('  (none — manifest declares no Covers: blocks)'));
    return;
  }
  console.log(table.toString());
}

export function statusLabel(s: RfpStatus): string {
  switch (s) {
    case 'supported':
      return 'Supported';
    case 'partial':
      return 'Partial';
    case 'roadmap':
      return 'Roadmap Q2';
    case 'guidance':
      return 'Guidance';
  }
}
