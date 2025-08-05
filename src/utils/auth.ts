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

    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        server.close();
        reject(new Error('Authentication timeout - please try again'));
      }
    }, 300000); // 5 minutes

    const cleanup = () => {
      clearTimeout(timeout);
      if (typeof (server as any).closeAllConnections === 'function') {
        (server as any).closeAllConnections();
      }
      server.close();
    };

    app.get('/auth-callback', (req: Request, res: Response) => {
      if (resolved) {
        res.status(403).send('Authentication flow already completed');
        return;
      }

      const apiKey = req.query.token as string | undefined;
      const organizationId = req.query.organization_id as string | undefined;
      const firstName = req.query.first_name as string | undefined;

      if (!apiKey || !organizationId) {
        res.status(400).send('Missing required parameters');
        cleanup();
        resolved = true;
        reject(new Error('Missing required parameters in callback'));
        return;
      }

      const appUrl = isStg ? APP_URL_STG : APP_URL;

      res.redirect(`${appUrl}/auth-completed`);

      res.on('finish', () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({ apiKey, organizationId, firstName });
        }
      });
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
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error(`Failed to start auth server: ${err.message}`));
      }
    });
  });
};
