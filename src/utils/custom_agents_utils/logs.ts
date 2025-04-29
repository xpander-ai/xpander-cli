import axios from 'axios';
import ora from 'ora';
import { XpanderClient } from '../client';

const BASE_URL = 'https://deployment-manager.xpander.ai';
const BASE_URL_STG = 'https://deployment-manager.stg.xpander.ai';

export const streamLogs = async (
  logsSpinner: ora.Ora,
  client: XpanderClient,
  agentId: string,
): Promise<void> => {
  const apiURL = client.isStg ? BASE_URL_STG : BASE_URL;
  const endpoint = `${apiURL}/${client.orgId}/registry/agents/${agentId}/custom_workers/logs`;

  const fetchLogs = async () => {
    try {
      const res = await axios.get<string[]>(endpoint, {
        headers: { 'x-api-key': client.apiKey },
        timeout: 5000,
      });

      if (Array.isArray(res.data)) {
        logsSpinner.text = res.data.join('\n');
      } else {
        logsSpinner.text = '';
      }
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        logsSpinner.text = '';
      } else {
        logsSpinner.text = `Error fetching logs: ${error.message}`;
      }
    }
  };

  // Polling every 2 seconds
  while (true) {
    await fetchLogs();
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
};
