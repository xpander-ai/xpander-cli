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
  icon?: string; // Icon (emoji) for the agent
  instructions?: {
    role?: string;
    goal?: string;
    general?: string;
  };
  // Additional properties from the API response
  assistant_id?: string;
  created_by_prompt?: any;
  thread_ids?: string[];
  prompts?: string[];
  enriched_prompts?: string[];
  tools?: any[];
  type?: string;
  model_name?: string;
  model_provider?: string;
  is_ai_employee?: boolean;
  deletable?: boolean;
  // Other properties that might be needed
}

/**
 * Represents a graph node in the agent operation graph
 */
export interface GraphNode {
  id: string;
  name: string;
  item_id: string;
  type?: string;
  interface_id?: string;
}

/**
 * Represents a connection between graph nodes
 */
export interface GraphConnection {
  source: string;
  target: string;
  condition: string;
}

/**
 * Represents a graph item with connection capabilities
 */
export interface GraphItem {
  id: string;
  name: string;
  item_id: string;
  agent: Agent;
}
