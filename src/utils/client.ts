import axios, { AxiosResponse } from 'axios';
import chalk from 'chalk';
import { getApiKey, getOrganizationId } from './config';
import { Agent } from '../types';

const API_BASE_URL = 'https://api.xpander.ai/v1';

/**
 * Client for interacting with the Xpander API
 */
export class XpanderClient {
  private client: any;
  private orgId: string | null = null;
  private baseUrl: string = API_BASE_URL;

  constructor(apiKey: string, orgId?: string) {
    // Get organization ID from config or passed parameter
    this.orgId = orgId || getOrganizationId() || null;

    if (!this.orgId) {
      console.log(chalk.yellow('Warning: No organization ID available.'));
      console.log(
        chalk.yellow('All API operations will require an organization ID.'),
      );
      console.log(chalk.yellow('Set your organization ID with:'));
      console.log(chalk.blue('  xpander configure --org YOUR_ORGANIZATION_ID'));
    }

    // Create Axios client with the base URL
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        // Include organization ID in headers if available
        ...(this.orgId && { 'X-Organization-Id': this.orgId }),
      },
    });

    // Add response interceptor to handle common errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: any) => {
        if (error.response) {
          const { status, data } = error.response;

          if (status === 401) {
            console.error(
              chalk.red(
                'Authentication error: Your API key is invalid or expired.',
              ),
            );
            console.error(
              chalk.blue(
                'Please run "xpander configure" to update your API key.',
              ),
            );
            process.exit(1);
          } else if (status === 403) {
            console.error(
              chalk.red(
                'Access denied: You do not have permission to perform this action.',
              ),
            );

            // If there's an organization ID problem, suggest how to fix it
            if (data?.message?.includes('organization')) {
              console.error(
                chalk.blue('Please check your organization ID or permissions.'),
              );
              console.error(
                chalk.blue('You can update your organization ID with:'),
              );
              console.error(
                chalk.blue('  xpander configure --org YOUR_ORGANIZATION_ID'),
              );
            }

            process.exit(1);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  /**
   * Checks if the client is ready by verifying organization ID exists
   */
  isReady(): boolean {
    return !!this.orgId && this.orgId.trim().length > 0;
  }

  /**
   * Retrieves the organization ID from the API
   * This ensures we have the correct organization ID for API calls
   */
  async getOrganizationId(): Promise<string | null> {
    try {
      // If we already have an organization ID from config, use it
      if (this.orgId) {
        return this.orgId;
      }

      // No longer trying to fetch from API
      console.log(chalk.yellow('No organization ID configured.'));
      console.log(chalk.yellow('Please configure your organization ID with:'));
      console.log(chalk.blue('  xpander configure --org YOUR_ORGANIZATION_ID'));

      return null;
    } catch (error) {
      console.error('Error in getOrganizationId:', error);
      return null;
    }
  }

  /**
   * Ensures we have an organization ID before making API calls
   * If not available, returns false
   */
  private async ensureOrganizationId(): Promise<boolean> {
    if (!this.orgId) {
      this.orgId = getOrganizationId();

      if (!this.orgId) {
        console.log(chalk.red('ERROR: No organization ID available.'));
        console.log(
          chalk.yellow(
            'An organization ID is REQUIRED for all API operations.',
          ),
        );
        console.log(chalk.yellow('Set your organization ID with:'));
        console.log(
          chalk.blue('  xpander configure --org YOUR_ORGANIZATION_ID'),
        );
        return false;
      }
    }
    return true;
  }

  /**
   * Gets the list of agents
   */
  async getAgents(): Promise<Agent[]> {
    try {
      // Ensure we have an organization ID
      const hasOrgId = await this.ensureOrganizationId();

      if (!hasOrgId) {
        console.log(
          chalk.red(
            'ERROR: No organization ID available. Cannot fetch agents.',
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
        return [];
      }

      console.log(`Fetching agents for organization: ${this.orgId}`);
      const url = `/${this.orgId}/agents/list`;
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
   * Gets a specific agent by ID
   */
  async getAgent(agentId: string): Promise<Agent | null> {
    try {
      // Ensure we have an organization ID
      const hasOrgId = await this.ensureOrganizationId();

      if (!hasOrgId) {
        console.log(
          chalk.red(
            'ERROR: No organization ID available. Cannot fetch agent details.',
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
        return null;
      }

      console.log(`Fetching agent ${agentId} for organization: ${this.orgId}`);
      const url = `/${this.orgId}/agents/${agentId}`;
      const response = await this.client.get(url);
      return response.data;
    } catch (error: any) {
      if (error.code === 'ERR_INVALID_URL') {
        console.log(
          'Error: Invalid URL for agent details. Organization ID may be incorrect.',
        );
        return null;
      } else if (error.response) {
        console.error(
          `API Error (${error.response.status}): ${
            error.response.data?.message || 'Unknown error'
          }`,
        );
      } else {
        console.error(
          `Error retrieving agent ${agentId}:`,
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
 * Create an authenticated API client
 */
export function createClient() {
  const apiKey = getApiKey();
  const orgId = getOrganizationId();

  if (!apiKey) {
    throw new Error('API key is not set. Run "xpander configure" to set it.');
  }

  return new XpanderClient(apiKey, orgId || undefined);
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
