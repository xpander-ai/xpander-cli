import { createParser } from 'eventsource-parser';
import ora from 'ora';
import { request } from 'undici';
import { XpanderClient } from '../client';

/** Deployment-manager origins */
const BASE_URL = 'https://agent-controller.xpander.ai';
const BASE_URL_STG = 'https://agent-controller.stg.xpander.ai';
// const BASE_URL_STG = 'http://localhost:9016'; // dont remove, for local work.

/**
 * Stream **live** logs from a custom-worker via Server-Sent Events.
 *
 * - Uses an `x-api-key` header (no query-param leak)
 * - Works in plain Node (no browser polyfills)
 * - Zero 3rd-party globals; compiles cleanly in strict TS configs
 */
export async function streamLogs(
  spinner: ora.Ora,
  client: XpanderClient,
  agentId: string,
): Promise<void> {
  const root = client.isStg ? BASE_URL_STG : BASE_URL;
  const url = `${root}/${client.orgId}/agent-containers/${agentId}/logs`;

  spinner.text = 'Waiting for logs…';

  /* Open the SSE connection */
  const { body } = await request(url, {
    method: 'GET',
    headers: {
      'x-api-key': client.apiKey,
      accept: 'text/event-stream',
      'cache-control': 'no-cache',
    },
    bodyTimeout: 0,
    headersTimeout: 0,
  });

  let firstLogReceived = false;

  /* Parse the stream, line-by-line */
  const parser = createParser({
    /** Every line emitted by the server arrives here */
    onEvent(evt: any) {
      if (!!evt?.data) {
        // Stop spinner and clear the waiting message when first log arrives
        if (!firstLogReceived) {
          spinner.stop();
          firstLogReceived = true;
        }
        process.stdout.write(`${evt.data}\n`);
      }
    },
    /** Optional: handle server-requested retry delays */
    onRetry(delay: number) {
      if (!firstLogReceived) {
        spinner.info(`server requested reconnect in ${delay} ms`);
      } else {
        console.log(`server requested reconnect in ${delay} ms`);
      }
    },
  });

  /* Feed the readable stream into the parser */
  for await (const chunk of body) {
    parser.feed(chunk.toString('utf-8'));
  }
}
