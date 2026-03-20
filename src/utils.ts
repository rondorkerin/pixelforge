import { createHash } from 'crypto';
import { mkdir, access, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';

export function hashPrompt(prompt: string, config: Record<string, unknown>): string {
  const content = JSON.stringify({ prompt, ...config });
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readJson<T>(path: string): Promise<T | null> {
  try {
    const data = await readFile(path, 'utf-8');
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function writeJson(path: string, data: unknown): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
}
