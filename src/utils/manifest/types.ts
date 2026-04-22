export type RfpStatus = 'supported' | 'partial' | 'roadmap' | 'guidance';

export interface RfpRequirement {
  id: string;
  name: string;
  status: RfpStatus;
}

export interface RfpBucket {
  code: string;
  name: string;
  requirements: RfpRequirement[];
}

export interface ManifestDoc {
  apiVersion?: string;
  kind?: string;
  metadata?: {
    name?: string;
    description?: string;
  };
  spec?: {
    development?: {
      framework?: string;
      language?: string;
      entrypoint?: string;
    };
    deployment?: {
      type?: string;
      targets?: Array<{
        cloud?: string;
        runtime?: string;
        region?: string;
        image?: string;
      }>;
    };
    instructions?: string;
    model?: string;
    tools?: Array<{
      name: string;
      description?: string;
      parameters?: unknown;
    }>;
    auth?: Record<string, unknown>;
    observability?: Record<string, unknown>;
  };
}

export interface ParsedManifest {
  path: string;
  raw: string;
  doc: ManifestDoc;
  coveredIds: string[];
  declaredUncoveredBuckets: string[];
}

export interface BucketCoverage {
  bucket: RfpBucket;
  covered: RfpRequirement[];
  uncovered: RfpRequirement[];
  percent: number;
  declaredUncovered: boolean;
}

export interface CoverageReport {
  buckets: BucketCoverage[];
  totalRequirements: number;
  totalCovered: number;
  overallPercent: number;
}
