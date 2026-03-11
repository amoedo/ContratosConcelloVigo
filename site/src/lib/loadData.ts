import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const derivedDir = fileURLToPath(new URL('../../public/data/derived/', import.meta.url));

export async function loadDerivedJson<T>(relativePath: string, fallback: T): Promise<T> {
  try {
    const absolutePath = path.join(derivedDir, relativePath);
    const raw = await fs.readFile(absolutePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
