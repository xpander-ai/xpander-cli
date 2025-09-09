/**
 * Represents an agent in the Xpander.ai system
 */
/**
 * Deployment type options for agents
 */
export type DeploymentType = 'serverless' | 'container';

export interface Agent {
  id: string;
  name: string;
  description: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  is_coordinate_mode: boolean;
  status: string;
  active?: boolean; // Whether the agent is active
  using_nemo: boolean; // Whether the agent use Nvidia NeMo
  version?: number;
  config?: any;
  icon?: string; // Icon (emoji) for the agent
  deployment_type?: DeploymentType; // Deployment type: serverless or container
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
  model_name: string;
  model_provider: string;
  is_ai_employee?: boolean;
  deletable?: boolean;
  // Other properties that might be needed
}
