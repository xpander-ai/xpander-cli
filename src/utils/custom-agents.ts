import fs from 'fs/promises';
import ora from 'ora';
import { REQUIRED_DEPLOYMENT_FILES } from '../constants/deployments';

export const pathIsEmpty = async (path: string) => {
  return fs.readdir(path).then((files) => {
    return files.length === 0;
  });
};

export const fileExists = async (path: string) => {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
};

export const ensureAgentIsInitialized = async (
  cwd: string,
  spinner: ora.Ora,
): Promise<boolean> => {
  const missingFiles: string[] = [];
  for (const file of REQUIRED_DEPLOYMENT_FILES) {
    if (!(await fileExists(`${cwd}/${file}`))) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length !== 0) {
    spinner.fail(
      'Current workdir structure is invalid, re-initialize your agent.',
    );
    return false;
  }
  return true;
};
