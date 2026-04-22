import * as fs from 'fs/promises';
import yaml from 'js-yaml';
import { ManifestDoc, ParsedManifest } from './types';

export async function loadManifest(filePath: string): Promise<ParsedManifest> {
  const raw = await fs.readFile(filePath, 'utf-8');
  const doc = (yaml.load(raw) ?? {}) as ManifestDoc;
  return { path: filePath, raw, doc };
}
