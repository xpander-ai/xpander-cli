export type NeMoGeneral = {
  use_uvloop: boolean;
  telemetry: any;
};

export type NeMoWorkflow = {
  _type: string;
  llm_name: string;
  verbose: boolean;
  retry_parsing_errors: boolean;
  max_retries: number;
};

export type NeMoLLM = {
  _type: string;
  model_name: string;
  temperature: number;
};

export type NeMoConfig = {
  general: NeMoGeneral;
  llms: Record<string, NeMoLLM>;
  workflow: NeMoWorkflow;
};
