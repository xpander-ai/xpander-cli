import axios from 'axios';
import chalk from 'chalk';
import {
  AgenticOperation,
  OperationSearchPayload,
} from '../../../types/agent/operation';

export class OperationApi {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  async getAgenticOperations(interfaceId: string): Promise<AgenticOperation[]> {
    try {
      const url = `${this.baseUrl}/agents-crud/tools/agent_tools/search-operations`;
      const payload: OperationSearchPayload = {
        interfaces: [
          {
            type: 'interface',
            asset_id: interfaceId,
          },
        ],
        search_phrases: [],
        list_mode: true,
      };

      const response = await axios.post(url, payload, {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!Array.isArray(response.data)) {
        console.log(
          chalk.yellow(
            'Warning: Unexpected response format from operations API',
          ),
        );
        return [];
      }

      return response.data.map((op: any) => ({
        id: op.id,
        name: op.name || op.id,
        summary: op.summary || '',
        description: op.description || '',
        idToUseOnGraph: op.id_to_use_on_graph,
        parentId: op.parent_id,
        isFunction: op.is_function || false,
        method: op.method || '',
        path: op.path || '',
      }));
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.log(
            chalk.yellow('Warning: No operations found for this interface'),
          );
        } else {
          console.log(
            chalk.red(
              `API error (${error.response?.status}): ${error.response?.data?.detail || error.message}`,
            ),
          );
        }
      } else {
        console.log(
          chalk.red(`Failed to retrieve operations: ${error.message}`),
        );
      }
      return [];
    }
  }
}
