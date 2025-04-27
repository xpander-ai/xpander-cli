import fs from 'fs/promises';

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
