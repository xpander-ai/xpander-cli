/**
 * Represents an agent
 */
export interface Agent {
  id: string;
  name: string;
  description?: string;
  tools?: any[];
  capabilities?: string[];
  status?: string;
}
