import axios from 'axios';
import ora from 'ora';
import { XpanderClient } from '../client';

const BASE_URL = 'https://deployment-manager.xpander.ai';
const BASE_URL_STG = 'https://deployment-manager.stg.xpander.ai';

/**
 * Streams the logs for a given custom worker.
 *
 * Only **new** log lines are printed to STDOUT so the terminal stays clean and
 * `ora` doesn’t re‑render the entire buffer on every poll (which causes the
 * flickering you noticed). The spinner itself is left with a single static
 * caption so it shows activity without thrashing the screen.
 */
export const streamLogs = async (
  logsSpinner: ora.Ora,
  client: XpanderClient,
  agentId: string,
): Promise<void> => {
  const apiURL = client.isStg ? BASE_URL_STG : BASE_URL;
  const endpoint = `${apiURL}/${client.orgId}/registry/agents/${agentId}/custom_workers/logs`;

  // Track every line we have already printed.
  const seen = new Set<string>();

  // Give the spinner a stable, one‑line caption and leave it alone afterwards.
  logsSpinner.text = 'Streaming logs…';

  const fetchLogs = async (): Promise<void> => {
    try {
      const res = await axios.get<string[]>(endpoint, {
        headers: { 'x-api-key': client.apiKey },
        timeout: 5000,
      });

      if (Array.isArray(res.data)) {
        for (const line of res.data) {
          if (!seen.has(line)) {
            seen.add(line);
            process.stdout.write(`${line}\n`); // print only the new line
          }
        }
      }
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // No logs yet – silently ignore so we don’t spam the user.
      } else {
        logsSpinner.fail(`Error fetching logs: ${error.message}`);
        throw error; // Bubble up so callers can decide what to do.
      }
    }
  };

  // Poll every two seconds until the caller aborts (Ctrl‑C or AbortController).
  while (true) {
    await fetchLogs();
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
};
