import * as fs from 'fs/promises';
import yaml from 'js-yaml';
import { ManifestDoc, ParsedManifest } from './types';

const REQ_ID_PATTERN = /\b([A-Z]{2})-(\d{3})\b/g;
const COVERS_LINE = /^\s*#\s*Covers:\s*(.*)$/i;
// Continuation lines must START (after `# \s+`) with a requirement ID —
// this prevents prose comments that happen to mention IDs (e.g. "SLA /
// drift fields (OB-001, OB-002...)") from being treated as covered.
const CONTINUATION = /^\s*#\s+([A-Z]{2}-\d{3}[^\n]*)$/;
const UNCOVERED_HEADER = /does NOT yet cover/i;
const BUCKET_LINE = /^\s*#\s+([A-Z]{2})\s+/;

export async function loadManifest(filePath: string): Promise<ParsedManifest> {
  const raw = await fs.readFile(filePath, 'utf-8');
  const doc = (yaml.load(raw) ?? {}) as ManifestDoc;
  const coveredIds = extractCoveredIds(raw);
  const declaredUncoveredBuckets = extractDeclaredUncovered(raw);
  return {
    path: filePath,
    raw,
    doc,
    coveredIds,
    declaredUncoveredBuckets,
  };
}

/**
 * Scan raw YAML for `# Covers: XX-NNN, YY-NNN` blocks. Continuation lines
 * that start with `#` and whitespace belong to the most recent Covers block
 * until a non-comment or differently-shaped comment appears.
 */
export function extractCoveredIds(raw: string): string[] {
  const ids = new Set<string>();
  const lines = raw.split('\n');
  let inCoversBlock = false;

  for (const line of lines) {
    const coversMatch = line.match(COVERS_LINE);
    if (coversMatch) {
      inCoversBlock = true;
      collectIds(coversMatch[1], ids);
      continue;
    }

    if (inCoversBlock) {
      const cont = line.match(CONTINUATION);
      if (cont) {
        collectIds(cont[1], ids);
        continue;
      }
      inCoversBlock = false;
    }
  }

  return Array.from(ids).sort();
}

function collectIds(text: string, sink: Set<string>): void {
  const matches = text.matchAll(REQ_ID_PATTERN);
  for (const m of matches) sink.add(`${m[1]}-${m[2]}`);
}

/**
 * Parse the tail section ("Buckets below are matrix requirements this
 * manifest does NOT yet cover"). Returns the bucket codes the author
 * flagged as uncovered (e.g. ['GC', 'PD', 'VR', ...]).
 */
export function extractDeclaredUncovered(raw: string): string[] {
  const lines = raw.split('\n');
  let inTail = false;
  const codes = new Set<string>();

  for (const line of lines) {
    if (UNCOVERED_HEADER.test(line)) {
      inTail = true;
      continue;
    }
    if (!inTail) continue;
    const bm = line.match(BUCKET_LINE);
    if (bm) codes.add(bm[1]);
  }

  return Array.from(codes).sort();
}
