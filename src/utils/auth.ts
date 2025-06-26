import http from 'http';
import express, { Request, Response } from 'express';
import open from 'open';
import { AuthResult } from '../types';

const APP_URL = 'https://app.xpander.ai';
const APP_URL_STG = 'https://stg.app.xpander.ai';

export const waitForAuthCallback = async (): Promise<AuthResult> => {
  const isStg = process?.env?.IS_STG === 'true';

  return new Promise((resolve, reject) => {
    const app = express();
    const port = 59123; // Fixed port due to web app bug - it ignores the port parameter
    const server = http.createServer(app);

    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('Authentication timeout - please try again'));
    }, 300000); // 5 minute timeout

    const cleanup = () => {
      clearTimeout(timeout);
    };

    app.get('/auth-callback', (req: Request, res: Response) => {
      const apiKey = req.query.token as string | undefined;
      const organizationId = req.query.organization_id as string | undefined;
      const firstName = req.query.first_name as string | undefined;

      if (!apiKey) {
        res.status(400).send('Missing token');
        cleanup();
        server.close();
        reject(new Error('Missing token in callback'));
        return;
      }
      if (!organizationId) {
        res.status(400).send('Missing organization id');
        cleanup();
        server.close();
        reject(new Error('Missing organization id in callback'));
        return;
      }

      const appUrl = isStg ? APP_URL_STG : APP_URL;

      res.send(`
        <html>
          <body>
            <p>Authentication successful! Attempting to close the window...</p>
            <button onclick="window.close()">Click here if it doesn't close automatically</button>
            <script>
              window.onload = () => {
                window.close();
                setTimeout(() => {
                  // If window wasn't closed, redirect to app
                  window.location.href = "${appUrl}";
                }, 3000); // 3 seconds
              };
            </script>
          </body>
        </html>
      `);

      // Immediately resolve and aggressively close server
      cleanup();

      // Force close all connections first
      if (server.closeAllConnections) {
        server.closeAllConnections();
      }

      // Close server without waiting for callback
      server.close();

      // Resolve immediately
      resolve({ organizationId, apiKey, firstName });
    });

    server.listen(port, async () => {
      const urlToOpen = `${isStg ? APP_URL_STG : APP_URL}/cli_login?port=${port}`;
      try {
        await open(urlToOpen);
      } catch (err) {
        console.error('Failed to open browser:', err);
      }
    });

    server.on('error', (err) => {
      console.error('Server error:', err);
      cleanup();
      reject(new Error(`Failed to start auth server: ${err.message}`));
    });
  });
};
