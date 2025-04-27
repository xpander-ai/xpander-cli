import axios, { AxiosResponse } from 'axios';
import chalk from 'chalk';
import { getApiKey, getOrganizationId, setOrganizationId } from './config';
import { Agent, GraphConnection, GraphNode } from '../types';
import { OperationApi } from './api/agent/operation';

const API_BASE_URL = 'https://inbound.xpander.ai';
const API_BASE_URL_STG = 'https://inbound.stg.xpander.ai';

/**
 * Client for interacting with the Xpander API
 */
export class XpanderClient {
  /**
   * Extract tool calls from an LLM response
   * Static utility method for working with LLM responses
   */
  static extractToolCalls(llmResponse: any): any[] {
    if (
      !llmResponse ||
      !llmResponse.choices ||
      llmResponse.choices.length === 0
    ) {
      return [];
    }

    const choice = llmResponse.choices[0];
    if (!choice.message || !choice.message.tool_calls) {
      return [];
    }

    return choice.message.tool_calls;
  }

  private client: any;
  public isStg: boolean = false;
  public orgId: string | null = null;
  private baseUrl: string = API_BASE_URL;
  private currentProfile: string | undefined;
  private operationApi: OperationApi;

  constructor(
    public apiKey: string,
    orgId?: string,
    profile?: string,
  ) {
    // Get organization ID from config or passed parameter

    this.isStg = process?.env?.IS_STG === 'true';
    if (this.isStg) {
      this.baseUrl = API_BASE_URL_STG;
    }

    this.orgId = orgId || getOrganizationId(profile) || null;
    this.currentProfile = profile;
    this.operationApi = new OperationApi(this.baseUrl, apiKey);

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
   * Updates an agent with new data
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
   * Get available agentic interfaces
   */
  async getAgenticInterfaces(): Promise<any[]> {
    try {
      // Using the confirmed working endpoint that doesn't require organization ID
      const url = `/agents-crud/tools/agent_tools/search-interfaces`;

      // Send the request with the working payload structure
      const response = await this.client.post(url, {
        search_phrase: '',
        list_mode: true,
      });

      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && response.data.detail === 'Not Found') {
        console.error(
          chalk.yellow(
            'API endpoint not found. The interfaces endpoint may have changed.',
          ),
        );
        return [];
      } else {
        // Log the actual response for debugging
        console.error('Unexpected response format:', response.data);
        return [];
      }
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const errorMessage =
          error.response.data?.detail ||
          error.response.data?.message ||
          JSON.stringify(error.response.data) ||
          'Unknown error';

        console.error(chalk.red(`API Error (${status}): ${errorMessage}`));

        // Additional information for debugging
        if (status === 404) {
          console.error(
            chalk.yellow(
              'The API endpoint could not be found. The API structure may have changed.',
            ),
          );
        } else if (status === 422) {
          console.error(
            chalk.yellow(
              'The API rejected the request. The required payload format may have changed.',
            ),
          );
          console.error(
            chalk.dim(
              'Sent payload:',
              JSON.stringify({
                search_phrase: '',
                list_mode: true,
              }),
            ),
          );
        }
      } else if (error.request) {
        console.error(
          chalk.red(
            'No response received from server. Check your network connection.',
          ),
        );
      } else {
        console.error(
          chalk.red(`Error fetching interfaces: ${error.message || error}`),
        );
      }
      return [];
    }
  }

  /**
   * Get operations for a specific interface
   */
  async getAgenticOperations(interfaceId: string): Promise<any[]> {
    return this.operationApi.getAgenticOperations(interfaceId);
  }

  /**
   * Get operations for a specific interface (alias for getAgenticOperations)
   */
  async getInterfaceOperations(interfaceId: string): Promise<any[]> {
    return this.getAgenticOperations(interfaceId);
  }

  /**
   * Attach operations to an agent
   */
  async attachAgentTools(
    agentId: string,
    toolsPayload: any[],
  ): Promise<boolean> {
    try {
      // Ensure we have an organization ID
      if (!this.orgId) {
        console.log(
          chalk.yellow(
            'Warning: No organization ID available. Cannot attach tools.',
          ),
        );
        return false;
      }

      // Use the correct endpoint based on the API structure
      const url = `/${this.orgId}/agents/${agentId}/tools`;

      await this.client.post(url, toolsPayload);
      return true;
    } catch (error: any) {
      if (error.response) {
        console.error(
          `API Error (${error.response.status}): ${
            error.response.data?.message || 'Unknown error'
          }`,
        );
      } else {
        console.error(`Error attaching tools:`, error.message || error);
      }
      return false;
    }
  }

  /**
   * Creates a graph item (node) for an agent
   * @param agentId Agent ID
   * @param itemId Operation ID to use on the graph
   * @param name Name of the graph item
   * @returns Graph item object
   */
  async createGraphNode(
    agentId: string,
    itemId: string,
    name: string,
  ): Promise<GraphNode> {
    try {
      // Ensure we have an organization ID
      if (!this.orgId) {
        console.log(
          chalk.yellow(
            'Warning: No organization ID available. Cannot create graph node.',
          ),
        );
        throw new Error('Organization ID is required');
      }

      // Use the correct endpoint based on the API structure
      const url = `/${this.orgId}/agents/${agentId}/graph/nodes`;

      const response = await this.client.post(url, {
        item_id: itemId,
        name: name,
      });

      return response.data;
    } catch (error) {
      console.error(chalk.red('Failed to create graph node:'), error);
      throw error;
    }
  }

  /**
   * Connects two graph nodes with an edge
   * @param agentId Agent ID
   * @param sourceId Source node ID
   * @param targetId Target node ID
   * @param condition Optional condition for the edge (default: 'success')
   * @returns Success status
   */
  async connectGraphNodes(
    agentId: string,
    sourceId: string,
    targetId: string,
    condition: string = 'success',
  ): Promise<boolean> {
    try {
      // Ensure we have an organization ID
      if (!this.orgId) {
        console.log(
          chalk.yellow(
            'Warning: No organization ID available. Cannot connect graph nodes.',
          ),
        );
        return false;
      }

      // Use the correct endpoint based on the API structure
      const url = `/${this.orgId}/agents/${agentId}/graph/edges`;

      await this.client.post(url, {
        source: sourceId,
        target: targetId,
        condition: condition,
      });

      return true;
    } catch (error) {
      console.error(chalk.red('Failed to connect graph nodes:'), error);
      return false;
    }
  }

  /**
   * Gets the graph structure for an agent
   * @param agentId Agent ID
   * @returns Graph structure with nodes and edges
   */
  async getAgentGraph(
    agentId: string,
  ): Promise<{ nodes: GraphNode[]; edges: GraphConnection[] }> {
    try {
      // Ensure we have an organization ID
      if (!this.orgId) {
        console.log(
          chalk.yellow(
            'Warning: No organization ID available. Cannot get agent graph.',
          ),
        );
        return { nodes: [], edges: [] };
      }

      // Use the correct endpoint based on the API structure
      const url = `/${this.orgId}/agents/${agentId}/graph`;

      const response = await this.client.get(url);
      return {
        nodes: response.data.nodes || [],
        edges: response.data.edges || [],
      };
    } catch (error) {
      console.error(chalk.red('Failed to get agent graph:'), error);
      return { nodes: [], edges: [] };
    }
  }

  /**
   * Syncs an agent
   */
  async syncAgent(agentId: string): Promise<boolean> {
    try {
      // Ensure we have an organization ID
      if (!this.orgId) {
        console.log(
          chalk.yellow(
            'Warning: No organization ID available. Cannot sync agent.',
          ),
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
          chalk.dim(`Deploying agent in organization: ${this.orgId}...`),
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
        console.error(
          chalk.red(
            `API Error (${error.response.status}): ${
              error.response.data?.message || 'Unknown error'
            }`,
          ),
        );
      } else {
        console.error(
          chalk.red(`Error deploying agent ${agentId}:`),
          error.message || error,
        );
      }
      return false;
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
