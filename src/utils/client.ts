import axios, { AxiosResponse } from 'axios';
import chalk from 'chalk';
import { getApiKey, getOrganizationId, setOrganizationId } from './config';
import { Agent } from '../types';

const API_BASE_URL = 'https://inbound.xpander.ai';

/**
 * Client for interacting with the Xpander API
 */
export class XpanderClient {
  private client: any;
  private orgId: string | null = null;
  private baseUrl: string = API_BASE_URL;
  private currentProfile: string | undefined;

  constructor(apiKey: string, orgId?: string, profile?: string) {
    // Get organization ID from config or passed parameter
    this.orgId = orgId || getOrganizationId(profile) || null;
    this.currentProfile = profile;

    // Create Axios client with the base URL and headers
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    });

    // Add response interceptor to handle common errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Extract organization ID from response if available and we don't have one
        if (!this.orgId && response.data) {
          // For agent list responses
          if (Array.isArray(response.data) && response.data.length > 0) {
            if (response.data[0].organization_id) {
              this.orgId = response.data[0].organization_id;
              this.saveExtractedOrgId();
            }
          }
          // For single agent responses
          else if (response.data.organization_id) {
            this.orgId = response.data.organization_id;
            this.saveExtractedOrgId();
          }
        }

        return response;
      },
      (error: any) => {
        if (error.response) {
          const { status, data } = error.response;

          if (status === 401) {
            console.error(
              chalk.red(
                'Authentication error: Your API key is invalid or expired.',
              ),
            );
          } else if (status === 403) {
            console.error(
              chalk.red(
                'Authorization error: You lack permission for this action.',
              ),
            );
          } else if (status === 404) {
            console.error(chalk.red('API Error (404): Resource not found'));
          } else if (status === 500) {
            console.error(
              chalk.red(
                `API Error (500): Server error occurred. ${data?.message || ''}`,
              ),
            );
          } else {
            console.error(
              chalk.red(
                `API Error (${status}): ${data?.message || 'Unknown error'}`,
              ),
            );
          }
        } else if (error.request) {
          console.error(
            chalk.red(
              'Network error: Please check your internet connection or try again later.',
            ),
          );
        } else {
          console.error(chalk.red(`Error: ${error.message}`));
        }
        return Promise.reject(error);
      },
    );
  }

  /**
   * Save any extracted organization ID to the config file
   */
  private saveExtractedOrgId(): void {
    if (this.orgId) {
      // Provide clear feedback when organization ID is extracted and saved
      console.log(chalk.green(`Organization ID detected: ${this.orgId}`));
      console.log(
        chalk.green(
          `Organization ID saved to profile "${this.currentProfile || 'default'}".`,
        ),
      );

      // Save the organization ID to the profile
      setOrganizationId(this.orgId, this.currentProfile);
    }
  }

  /**
   * Check if the client is ready for API operations
   */
  isReady(): boolean {
    return true; // We can now work without an organization ID
  }

  /**
   * Gets the organization ID if available
   */
  async getOrganizationId(): Promise<string | null> {
    return this.orgId;
  }

  /**
   * Ensure we have an organization ID - no longer required but kept for compatibility
   * @returns true if we have an organization ID, false otherwise
   */
  private async ensureOrganizationId(): Promise<boolean> {
    return true; // We no longer require an organization ID for basic operations
  }

  /**
   * Gets the list of agents
   */
  async getAgents(): Promise<Agent[]> {
    try {
      // Use the verified working endpoint from our testing
      const url = `/v1/agents/list`;
      const response = await this.client.get(url);

      if (response.data) {
        return response.data;
      } else {
        console.log('Warning: Received unexpected data format from API.');
        return [];
      }
    } catch (error: any) {
      if (error.code === 'ERR_INVALID_URL') {
        console.log(
          'Error: Invalid URL for agent list. Organization ID may be incorrect.',
        );
        return [];
      } else if (error.response) {
        console.error(
          `API Error (${error.response.status}): ${
            error.response.data?.message || 'Unknown error'
          }`,
        );
      } else {
        console.error('Error retrieving agents:', error.message || error);
      }
      return [];
    }
  }

  /**
   * Gets details of a specific agent
   * @param agentId The ID of the agent to retrieve
   */
  async getAgent(agentId: string): Promise<Agent | null> {
    try {
      // Reduce console output - make it less verbose
      // Use quieter approach for log messages during agent retrieval

      // Use the getAgents method to fetch all agents
      const agents = await this.getAgents();

      // Find the specific agent by ID
      const foundAgent = agents.find((a) => a.id === agentId);

      if (!foundAgent) {
        return null;
      }

      // For backward compatibility, ensure all expected fields are present
      // This helps ensure the agent details are properly displayed
      const enhancedAgent: Agent = {
        ...foundAgent,
        // Add any missing fields with default values
        type: foundAgent.type || 'regular',
        status: foundAgent.status || 'ACTIVE',
        tools: foundAgent.tools || [],
        version: foundAgent.version || 1,
        organization_id: foundAgent.organization_id || this.orgId || '',
        model_provider: foundAgent.model_provider || 'openai',
        model_name: foundAgent.model_name || 'gpt-4',
        // Add other fields as needed
      };

      return enhancedAgent;
    } catch (error: any) {
      console.error(
        chalk.red('Error retrieving agent details:'),
        error.message || error,
      );
      return null;
    }
  }

  /**
   * Creates a new agent
   */
  async createAgent(name: string): Promise<Agent> {
    try {
      if (this.orgId) {
        // Reduce verbosity - use more subtle indication
        console.log(
          chalk.dim(`Creating agent in organization: ${this.orgId}...`),
        );
      }

      const url = '/agents-crud/tools/crud/create';

      // Prepare request payload
      const payload = {
        name,
        ...(this.orgId ? { organization_id: this.orgId } : {}),
      };

      const config = {
        method: 'POST',
        url: `${this.baseUrl}${url}`,
        headers: {
          'x-api-key': this.client.defaults.headers['x-api-key'],
          'Content-Type': 'application/json',
        },
        data: payload,
      };

      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      console.error(chalk.red('\n❌ Failed to create agent:'));
      if (error.response) {
        console.error(chalk.red(`Error code: ${error.response.status}`));
        console.error(
          chalk.red(
            `Message: ${error.response.data?.message || 'Unknown error'}`,
          ),
        );
      } else if (error.request) {
        console.error(chalk.red('No response received from server'));
      } else {
        console.error(chalk.red(error.message || 'Unknown error occurred'));
      }
      throw new Error('Failed to create agent');
    }
  }

  /**
   * Deletes an agent
   */
  async deleteAgent(agentId: string): Promise<boolean> {
    try {
      if (this.orgId) {
        console.log(
          `Deleting agent ${agentId} from organization: ${this.orgId}...`,
        );
      }
      const url = '/agents-crud/tools/crud/delete';

      // Prepare request payload
      const payload = {
        agent_id: agentId,
        ...(this.orgId ? { organization_id: this.orgId } : {}),
      };

      const config = {
        method: 'DELETE',
        url: `${this.baseUrl}${url}`,
        headers: {
          'x-api-key': this.client.defaults.headers['x-api-key'],
          'Content-Type': 'application/json',
        },
        data: payload,
      };

      await axios(config);
      return true;
    } catch (error: any) {
      if (error.response) {
        console.error(chalk.red(`Status: ${error.response.status}`));
        console.error(
          chalk.red(
            `Message: ${error.response.data?.message || 'Unknown error'}`,
          ),
        );
      } else if (error.request) {
        console.error(chalk.red('No response received from server'));
      } else {
        console.error(chalk.red(error.message || 'Unknown error occurred'));
      }
      throw new Error('Failed to delete agent');
    }
  }

  /**
   * Updates an agent
   */
  async updateAgent(
    agentId: string,
    data: Partial<Agent>,
  ): Promise<Agent | null> {
    try {
      // First, verify that the agent exists before attempting update
      // Make verification step more subtle
      const agentExists = await this.getAgent(agentId);

      if (!agentExists) {
        console.error(
          chalk.red(`Agent with ID ${agentId} not found. Cannot update.`),
        );
        return null;
      }

      if (this.orgId) {
        // Make this log subtle
        console.log(chalk.dim(`Updating agent details...`));
      }

      // Format for the update endpoint
      const url = `/agents-crud/tools/crud/update`;

      // Prepare request payload
      // Make sure organization_id is always included and format data correctly
      const payload = {
        agent_id: agentId,
        organization_id: this.orgId,
        ...data,
      };

      // Reduce payload logging to be less verbose
      console.log(chalk.dim('Sending update request...'));

      const config = {
        method: 'PATCH',
        url: `${this.baseUrl}${url}`,
        headers: {
          'x-api-key': this.client.defaults.headers['x-api-key'],
          'Content-Type': 'application/json',
        },
        data: payload,
      };

      const response = await axios(config);

      // Don't log the entire response
      return response.data;
    } catch (error: any) {
      console.error(chalk.red('Failed to update agent:'));

      if (error.response) {
        console.error(chalk.red(`Error code: ${error.response.status}`));
        console.error(
          chalk.red(
            `Message: ${JSON.stringify(error.response.data) || 'Unknown error'}`,
          ),
        );
      } else if (error.request) {
        console.error(chalk.red('No response received from server'));
      } else {
        console.error(chalk.red(error.message || 'Unknown error occurred'));
      }

      // Return null instead of throwing to better handle the error at the command level
      return null;
    }
  }

  /**
   * Syncs an agent
   */
  async syncAgent(agentId: string): Promise<boolean> {
    try {
      // Ensure we have an organization ID
      const hasOrgId = await this.ensureOrganizationId();

      if (!hasOrgId) {
        console.log(
          'Warning: No organization ID available. Cannot sync agent.',
        );
        return false;
      }

      console.log(`Syncing agent ${agentId} in organization: ${this.orgId}...`);
      const url = `/${this.orgId}/agents/${agentId}/sync`;
      await this.client.post(url);
      return true;
    } catch (error: any) {
      if (error.response) {
        console.error(
          `API Error (${error.response.status}): ${
            error.response.data?.message || 'Unknown error'
          }`,
        );
      } else {
        console.error(
          `Error syncing agent ${agentId}:`,
          error.message || error,
        );
      }
      return false;
    }
  }

  /**
   * Deploys an agent
   */
  async deployAgent(agentId: string): Promise<boolean> {
    try {
      if (this.orgId) {
        console.log(
          chalk.dim(`Deploying agent to organization: ${this.orgId}...`),
        );
      }
      const url = '/agents-crud/tools/crud/deploy';

      // Prepare request payload
      const payload = {
        agent_id: agentId,
        ...(this.orgId ? { organization_id: this.orgId } : {}),
      };

      const config = {
        method: 'PUT',
        url: `${this.baseUrl}${url}`,
        headers: {
          'x-api-key': this.client.defaults.headers['x-api-key'],
          'Content-Type': 'application/json',
        },
        data: payload,
      };

      await axios(config);
      return true;
    } catch (error: any) {
      if (error.response) {
        console.error(chalk.red(`Status: ${error.response.status}`));
        console.error(
          chalk.red(
            `Message: ${error.response.data?.message || 'Unknown error'}`,
          ),
        );
      } else if (error.request) {
        console.error(chalk.red('No response received from server'));
      } else {
        console.error(chalk.red(error.message || 'Unknown error occurred'));
      }
      throw new Error('Failed to deploy agent');
    }
  }
}

/**
 * Creates a new Xpander client instance
 * @param profile Optional profile name to use
 */
export function createClient(profile?: string) {
  const apiKey = getApiKey(profile);
  const orgId = getOrganizationId(profile);

  if (!apiKey) {
    console.log(
      chalk.red(
        'No API key found. Please run "xpander configure" to set up your credentials.',
      ),
    );
    // Throw an error instead of exiting the process
    throw new Error('API key not found');
  }

  return new XpanderClient(apiKey, orgId || undefined, profile);
}

/**
 * Try to extract organization ID from API responses
 */
export function extractOrgIdFromError(error: any): string | null {
  if (error.response?.data?.organizationId) {
    return error.response.data.organizationId;
  }

  if (error.response?.data?.message) {
    const match = error.response.data.message.match(
      /organization[-_\s]?id[:\s]+["']?([a-zA-Z0-9_-]+)["']?/i,
    );
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
