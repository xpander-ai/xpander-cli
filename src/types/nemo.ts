export type NeMoLLM = {
  _type: string;
  model_name: string;
  temperature: number;
};
export type NeMoConfig = {
  llms: Record<string, NeMoLLM>;
};
