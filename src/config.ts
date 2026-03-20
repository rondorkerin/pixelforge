import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import type { PixelForgeConfig } from './types.js';

export function loadConfig(overrides: Partial<PixelForgeConfig> = {}): PixelForgeConfig {
  dotenvConfig();

  const cwd = process.cwd();

  return {
    openaiApiKey: overrides.openaiApiKey || process.env.OPENAI_API_KEY || '',
    provider: overrides.provider || process.env.PIXELFORGE_PROVIDER || 'openai',
    concurrency: overrides.concurrency || parseInt(process.env.PIXELFORGE_CONCURRENCY || '5', 10),
    costLimit: overrides.costLimit || parseFloat(process.env.PIXELFORGE_COST_LIMIT || '50'),
    definitionsPath: overrides.definitionsPath || resolve(cwd, 'assets/definitions'),
    outputPath: overrides.outputPath || resolve(cwd, 'output'),
    cachePath: overrides.cachePath || resolve(cwd, 'cache'),
    exportPath: overrides.exportPath || resolve(cwd, 'export'),
  };
}
