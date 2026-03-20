import { join } from 'path';
import { hashPrompt, ensureDir, fileExists, readJson, writeJson } from '../utils.js';
import { log } from '../logger.js';

interface CacheEntry {
  assetId: string;
  promptHash: string;
  rawPath: string;
  prompt: string;
  provider: string;
  timestamp: string;
  cost: number;
}

export class CacheManager {
  private cachePath: string;
  private indexPath: string;
  private index: Map<string, CacheEntry> = new Map();

  constructor(cachePath: string) {
    this.cachePath = cachePath;
    this.indexPath = join(cachePath, 'cache-index.json');
  }

  async init(): Promise<void> {
    await ensureDir(this.cachePath);
    const data = await readJson<Record<string, CacheEntry>>(this.indexPath);
    if (data) {
      this.index = new Map(Object.entries(data));
    }
  }

  getHash(prompt: string, config: Record<string, unknown> = {}): string {
    return hashPrompt(prompt, config);
  }

  async has(assetId: string, promptHash?: string): Promise<boolean> {
    const entry = this.index.get(assetId);
    if (!entry) return false;
    if (promptHash && entry.promptHash !== promptHash) return false;
    return fileExists(entry.rawPath);
  }

  async get(assetId: string): Promise<CacheEntry | undefined> {
    return this.index.get(assetId);
  }

  async set(assetId: string, entry: Omit<CacheEntry, 'assetId'>): Promise<void> {
    this.index.set(assetId, { assetId, ...entry });
    await this.saveIndex();
  }

  async delete(assetId: string): Promise<void> {
    this.index.delete(assetId);
    await this.saveIndex();
  }

  getRawPath(assetId: string, promptHash: string): string {
    return join(this.cachePath, 'raw', `${assetId}_${promptHash}.png`);
  }

  private async saveIndex(): Promise<void> {
    const data = Object.fromEntries(this.index);
    await writeJson(this.indexPath, data);
  }
}
