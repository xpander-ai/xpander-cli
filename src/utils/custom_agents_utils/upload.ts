import fs from 'fs';
import axios from 'axios';
import ora from 'ora';
import ProgressStream from 'progress-stream';
import { XpanderClient } from '../client';

const BASE_URL = 'https://deployment-manager.xpander.ai';
const BASE_URL_STG = 'https://deployment-manager.xpander.ai';

export const uploadAndDeploy = async (
  deploymentSpinner: ora.Ora,
  client: XpanderClient,
  agentId: string,
  imagePath: string,
): Promise<any> => {
  const apiURL = client.isStg ? BASE_URL_STG : BASE_URL;
  const fileSize = fs.statSync(imagePath).size;
  const fileStream = fs.createReadStream(imagePath);

  try {
    // Step 1: Get upload URL
    deploymentSpinner.text = 'Requesting upload URL...';

    const uploadLinkEndpoint = `${apiURL}/${client.orgId}/registry/agents/${agentId}/custom_workers/upload_link`;

    const uploadLinkRes = await axios.get(uploadLinkEndpoint, {
      headers: {
        'x-api-key': client.apiKey,
      },
    });

    const { link: uploadUrl } = uploadLinkRes.data;
    if (!uploadUrl) {
      console.error(
        '❌ No upload URL returned in response:',
        uploadLinkRes.data,
      );
      throw new Error('No upload URL received from server.');
    }

    // Step 2: Upload to xpander.ai
    deploymentSpinner.text = 'Uploading to xpander.ai...';

    const progressStream = ProgressStream({
      length: fileSize,
      time: 100,
    });

    progressStream.on('progress', (progress) => {
      const percent = progress.percentage.toFixed(2);
      if (progress.percentage >= 95) {
        deploymentSpinner.text = 'Finalizing the deployment';
      } else {
        deploymentSpinner.text = `Upload status: ${percent}%`;
      }
    });

    fileStream.pipe(progressStream);

    const uploadRes = await axios.put(uploadUrl, progressStream, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Length': fileSize,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
    });

    if (uploadRes.status !== 200) {
      console.error('❌ Upload failed with body:', uploadRes.data);
      throw new Error(`xpander.ai upload failed: ${uploadRes.status}`);
    }

    // Step 3: Apply uploaded worker
    const applyEndpoint = `${apiURL}/${client.orgId}/registry/agents/${agentId}/custom_workers/start`;

    deploymentSpinner.text = 'Applying uploaded worker...';

    const applyRes = await axios.post(
      applyEndpoint,
      {},
      {
        headers: {
          'x-api-key': client.apiKey,
        },
      },
    );

    deploymentSpinner.succeed('✅ Upload and deployment complete');
    return applyRes.data;
  } catch (err: any) {
    deploymentSpinner.fail('❌ Upload failed');

    if (axios.isAxiosError(err)) {
      console.error('❌ Axios error:', {
        message: err.message,
        code: err.code,
        responseStatus: err.response?.status,
        responseData: err.response?.data,
        requestHeaders: err.config?.headers,
        requestUrl: err.config?.url,
      });
    } else {
      console.error('❌ Unexpected error:', err);
    }

    throw new Error(err?.message || 'Unknown error during upload');
  }
};
