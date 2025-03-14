export interface AgenticOperation {
  id: string;
  name: string;
  summary: string;
  description: string;
  idToUseOnGraph: string;
  parentId: string;
  isFunction: boolean;
  method: string;
  path: string;
}

export interface OperationSearchPayload {
  interfaces: Array<{
    type: string;
    asset_id: string;
  }>;
  search_phrases: string[];
  list_mode: boolean;
}
