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

    // Create Axios client with the base URL
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
      // Only log this if verbose logging is enabled
      // For now we'll disable it completely to avoid confusing users
      // console.log(`Extracted organization ID: ${this.orgId}`);
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
      // Create a single, clean message that includes the organization ID if available
      if (this.orgId) {
        console.log(`Fetching agents for organization: ${this.orgId}`);
      } else {
        console.log(`Fetching agents...`);
      }

      // Use the verified working endpoint from our testing
      const url = `/v1/agents/list`;
      const response = await this.client.get(url);

      if (response.data && Array.isArray(response.data)) {
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
      // Use the same URL pattern that worked for listing agents
      console.log(`Fetching agent ${agentId}`);
      const url = `/v1/agents/${agentId}`;
      const response = await this.client.get(url);
      return response.data;
    } catch (error: any) {
      if (error.code === 'ERR_INVALID_URL') {
        console.log('Error: Invalid URL for agent details.');
        return null;
      } else if (error.response) {
        console.error(
          `API Error (${error.response.status}): ${
            error.response.data?.message || 'Unknown error'
          }`,
        );
      } else {
        console.error(
          'Error retrieving agent details:',
          error.message || error,
        );
      }
      return null;
    }
  }

  /**
   * Creates a new agent
   */
  async createAgent(name: string): Promise<Agent> {
    try {
      // Ensure we have an organization ID
      const hasOrgId = await this.ensureOrganizationId();

      if (!hasOrgId) {
        console.log(
          chalk.red(
            'ERROR: No organization ID available. Cannot create agent.',
          ),
        );
        console.log(
          chalk.yellow(
            'An organization ID is REQUIRED for all API operations.',
          ),
        );
        console.log(chalk.yellow('Set your organization ID with:'));
        console.log(
          chalk.blue('  xpander configure --org YOUR_ORGANIZATION_ID'),
        );
        throw new Error('Organization ID is required to create an agent');
      }

      console.log(`Creating agent for organization: ${this.orgId}...`);
      const url = `/${this.orgId}/agents-crud/tools/crud/create`;
      const response = await this.client.post(url, { name: name });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.error(
          `API Error (${error.response.status}): ${
            error.response.data?.message || 'Unknown error'
          }`,
        );
      } else {
        console.error('Error creating agent:', error.message || error);
      }
      throw new Error('Failed to create agent');
    }
  }

  /**
   * Deletes an agent
   */
  async deleteAgent(agentId: string): Promise<boolean> {
    try {
      // Ensure we have an organization ID
      const hasOrgId = await this.ensureOrganizationId();

      if (!hasOrgId) {
        console.log(
          'Warning: No organization ID available. Cannot delete agent.',
        );
        return false;
      }

      console.log(
        `Deleting agent ${agentId} from organization: ${this.orgId}...`,
      );
      const url = `/${this.orgId}/agents/${agentId}`;
      await this.client.delete(url);
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
          `Error deleting agent ${agentId}:`,
          error.message || error,
        );
      }
      return false;
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
      // Ensure we have an organization ID
      const hasOrgId = await this.ensureOrganizationId();

      if (!hasOrgId) {
        console.log(
          'Warning: No organization ID available. Cannot update agent.',
        );
        return null;
      }

      console.log(
        `Updating agent ${agentId} in organization: ${this.orgId}...`,
      );
      const url = `/${this.orgId}/agents/${agentId}`;
      const response = await this.client.put(url, data);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.error(
          `API Error (${error.response.status}): ${
            error.response.data?.message || 'Unknown error'
          }`,
        );
      } else {
        console.error(
          `Error updating agent ${agentId}:`,
          error.message || error,
        );
      }
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
    process.exit(1);
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
