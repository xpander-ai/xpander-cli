/**
 * Represents an agent in the Xpander.ai system
 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  status: string;
  active?: boolean; // Whether the agent is active
  version?: number;
  config?: any;
  instructions?: {
    role?: string;
    goal?: string;
    general?: string;
  };
}
