import fs from 'fs';
import axios from 'axios';
import ora from 'ora';
import ProgressStream from 'progress-stream';
import { BillingErrorHandler } from '../billing-error';
import { XpanderClient } from '../client';

const BASE_URL = 'https://inbound.xpander.ai';
// const BASE_URL_STG = 'https://inbound.stg.xpander.ai';
const BASE_URL_STG = 'http://localhost:8085'; // dont remove, for local work.

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

    const uploadLinkEndpoint = `${apiURL}/agent-containers/${agentId}/generate_upload_link`;

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
        deploymentSpinner.text = 'Finalizing image upload';
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
    const applyEndpoint = `${apiURL}/agent-containers/${agentId}/deploy`;

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
      // Check for 429 billing error first
      if (BillingErrorHandler.handleIfBillingError(err, client.isStg)) {
        throw new Error('Billing limit reached');
      }

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

/**
 * Restart a custom worker deployment
 * This automatically stops the current deployment and starts a new one
 */
export const restartDeployment = async (
  spinner: ora.Ora,
  client: XpanderClient,
  agentId: string,
): Promise<any> => {
  const apiURL = client.isStg ? BASE_URL_STG : BASE_URL;
  const startEndpoint = `${apiURL}/agent-containers/${agentId}/start`;

  try {
    spinner.text = 'Restarting deployment...';

    const restartRes = await axios.post(
      startEndpoint,
      {},
      {
        headers: {
          'x-api-key': client.apiKey,
        },
      },
    );

    spinner.succeed('✅ Deployment restarted successfully');
    return restartRes.data;
  } catch (err: any) {
    spinner.fail('❌ Restart failed');

    if (axios.isAxiosError(err)) {
      // Check for 429 billing error first
      if (BillingErrorHandler.handleIfBillingError(err, client.isStg)) {
        throw new Error('Billing limit reached');
      }

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

    throw new Error(err?.message || 'Unknown error during restart');
  }
};

/**
 * Stop a custom worker deployment
 */
export const stopDeployment = async (
  spinner: ora.Ora,
  client: XpanderClient,
  agentId: string,
): Promise<any> => {
  const apiURL = client.isStg ? BASE_URL_STG : BASE_URL;
  const stopEndpoint = `${apiURL}/agent-containers/${agentId}/stop`;

  try {
    spinner.text = 'Stopping deployment...';

    const stopRes = await axios.delete(stopEndpoint, {
      headers: {
        'x-api-key': client.apiKey,
      },
    });

    spinner.succeed('✅ Deployment stopped successfully');
    return stopRes.data;
  } catch (err: any) {
    spinner.fail('❌ Stop failed');

    if (axios.isAxiosError(err)) {
      // Check for 429 billing error first
      if (BillingErrorHandler.handleIfBillingError(err, client.isStg)) {
        throw new Error('Billing limit reached');
      }

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

    throw new Error(err?.message || 'Unknown error during stop');
  }
};
