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
    const port = 59123;
    const server = http.createServer(app);

    app.get('/auth-callback', (req: Request, res: Response) => {
      const apiKey = req.query.token as string | undefined;
      const organizationId = req.query.organization_id as string | undefined;
      const firstName = req.query.first_name as string | undefined;

      if (!apiKey) {
        res.status(400).send('Missing token');
        return;
      }
      if (!organizationId) {
        res.status(400).send('Missing organization id');
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

      // Close the server and resolve the token
      server.close((err) => {
        if (err) {
          return reject(err);
        }
        resolve({ organizationId, apiKey, firstName });
      });
    });

    server.listen(port, async () => {
      const urlToOpen = `${isStg ? APP_URL_STG : APP_URL}/cli_login`;
      try {
        await open(urlToOpen);
      } catch (err) {
        console.error('Failed to open browser:', err);
      }
    });
  });
};
