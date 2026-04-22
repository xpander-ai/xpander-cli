import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import { ParsedManifest } from './types';

const DEFAULT_ENDPOINT = 'http://localhost:8080';

export interface InvokeOptions {
  endpoint?: string;
  sessionId?: string;
  json?: boolean;
}

/**
 * POST a prompt to the manifest-declared agent endpoint using the
 * AWS Bedrock AgentCore HTTP contract (POST /invocations, body
 * `{"prompt": "..."}`). The contract is what `agent.py` in the
 * declarative demo implements verbatim.
 */
export async function invokeManifestAgent(
  manifest: ParsedManifest,
  prompt: string,
  opts: InvokeOptions,
): Promise<void> {
  const endpoint = resolveEndpoint(manifest, opts.endpoint);
  const url = `${endpoint.replace(/\/$/, '')}/invocations`;
  const name = manifest.doc.metadata?.name ?? 'agent';

  const header = `${chalk.hex('#743CFF')('xpander invoke')} → ${chalk.bold(
    name,
  )} ${chalk.dim(`(${endpoint})`)}`;
  console.log('');
  console.log(header);
  console.log(chalk.dim('─'.repeat(60)));
  console.log(`  ${chalk.green('›')} ${chalk.italic(prompt)}`);
  console.log('');

  const sessionId = opts.sessionId ?? generateSessionId();
  const spinner = ora('Invoking agent...').start();
  const started = Date.now();

  try {
    const response = await axios.post(
      url,
      { prompt },
      {
        timeout: 60_000,
        headers: {
          'Content-Type': 'application/json',
          'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': sessionId,
        },
      },
    );
    const elapsed = Date.now() - started;
    spinner.succeed(`Response received ${chalk.dim(`(${elapsed}ms)`)}`);

    const reply = extractReply(response.data);
    console.log('');
    if (opts.json) {
      console.log(JSON.stringify(response.data, null, 2));
    } else {
      console.log(chalk.dim('─'.repeat(60)));
      console.log(`  ${chalk.hex('#743CFF')('◆')} ${reply}`);
      console.log(chalk.dim('─'.repeat(60)));
    }
  } catch (err: any) {
    spinner.fail('Invocation failed');
    if (err.code === 'ECONNREFUSED') {
      console.error(
        chalk.red(`  Could not reach ${url}`),
        chalk.dim('\n  Is the agent running? Try:  python3 agent.py'),
      );
    } else if (err.code === 'ECONNABORTED') {
      console.error(chalk.red('  Agent timed out (60s)'));
    } else if (err.response) {
      console.error(
        chalk.red(`  HTTP ${err.response.status}`),
        chalk.dim(JSON.stringify(err.response.data)),
      );
    } else {
      console.error(chalk.red(`  ${err.message ?? String(err)}`));
    }
    process.exitCode = 1;
  }
}

function resolveEndpoint(
  manifest: ParsedManifest,
  override?: string,
): string {
  if (override) return override;
  const target = manifest.doc.spec?.deployment?.targets?.[0] as
    | { endpoint?: string }
    | undefined;
  if (target?.endpoint) return target.endpoint;
  return DEFAULT_ENDPOINT;
}

function extractReply(data: unknown): string {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.response === 'string') return d.response;
    if (typeof d.result === 'string') return d.result;
    if (typeof d.message === 'string') return d.message;
  }
  return JSON.stringify(data, null, 2);
}

function generateSessionId(): string {
  // AgentCore session IDs must be >= 33 chars per the contract.
  const rand = Math.random().toString(36).slice(2);
  const ts = Date.now().toString(36);
  return `xpander-cli-${ts}-${rand}${rand}`.slice(0, 40);
}
