import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import ora from 'ora';
import ProgressStream from 'progress-stream';
import { XpanderClient } from '../client';

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
const BASE_URL = 'https://deployment-manager.xpander.ai';
const BASE_URL_STG = 'https://deployment-manager.stg.xpander.ai';

export const uploadAndDeploy = async (
  deploymentSpinner: ora.Ora,
  client: XpanderClient,
  agentId: string,
  imagePath: string,
): Promise<any> => {
  const apiURL = client.isStg ? BASE_URL_STG : BASE_URL;
  const endpoint = `${apiURL}/${client.orgId}/registry/agents/${agentId}/custom_workers/deploy`;
  const fileSize = fs.statSync(imagePath).size;
  const fileName = `${client.orgId}_worker_${agentId}.tar.gz`;

  const fileStream = fs.createReadStream(imagePath, {
    highWaterMark: CHUNK_SIZE,
  });
  let start = 0;
  let chunkIndex = 0;

  for await (const chunk of fileStream) {
    const end = start + chunk.length - 1;
    const contentRange = `bytes ${start}-${end}/${fileSize}`;

    // Use ProgressStream to wrap chunk as stream
    const chunkStream = ProgressStream({
      length: chunk.length,
      time: 100,
    });

    chunkStream.on('progress', () => {
      const percentNumber = Math.min(100, ((end + 1) / fileSize) * 100);
      if (percentNumber >= 95) {
        deploymentSpinner.text = 'Finalizing the deployment';
      } else {
        const percent = percentNumber.toFixed(2);
        deploymentSpinner.text = `Upload status: ${percent}%`;
      }
    });

    // Write chunk to progress stream
    chunkStream.end(chunk);

    const form = new FormData();
    form.append('file', chunkStream, {
      filename: fileName,
      contentType: 'application/octet-stream',
      knownLength: chunk.length,
    });

    const response = await axios.post(endpoint, form, {
      headers: {
        'Content-Range': contentRange,
        'x-api-key': client.apiKey,
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    start = end + 1;
    chunkIndex++;

    if (response.data.complete) {
      deploymentSpinner.succeed('✅ Upload complete');
      return response.data;
    }
  }
};
