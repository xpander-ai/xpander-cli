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
}
