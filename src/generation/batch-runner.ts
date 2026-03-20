import pLimit from 'p-limit';
import { join } from 'path';
import { log } from '../logger.js';
import { ensureDir } from '../utils.js';
import { buildPrompt } from '../prompts/template-engine.js';
import type { CacheManager } from './cache.js';
import type { CostTracker } from './cost-tracker.js';
import type { OpenAIProvider } from './providers/openai.js';
import type { PostProcessor } from '../processing/post-processor.js';
import type { AssetDefinition, PixelForgeConfig, BiomeDefinition, PaletteDefinition } from '../types.js';

interface LoadedDefinitions {
  assets: AssetDefinition[];
  biomes: Map<string, BiomeDefinition>;
  palettes: Map<string, PaletteDefinition>;
}

interface BatchRunnerOptions {
  config: PixelForgeConfig;
  cache: CacheManager;
  costTracker: CostTracker;
  provider: OpenAIProvider;
  processor: PostProcessor;
  definitions: LoadedDefinitions;
  force: boolean;
}

interface RunStats {
  total: number;
  generated: number;
  cached: number;
  failed: number;
  skipped: number;
}

export class BatchRunner {
  private config: PixelForgeConfig;
  private cache: CacheManager;
  private costTracker: CostTracker;
  private provider: OpenAIProvider;
  private processor: PostProcessor;
  private definitions: LoadedDefinitions;
  private force: boolean;

  constructor(options: BatchRunnerOptions) {
    this.config = options.config;
    this.cache = options.cache;
    this.costTracker = options.costTracker;
    this.provider = options.provider;
    this.processor = options.processor;
    this.definitions = options.definitions;
    this.force = options.force;
  }

  async run(assets: AssetDefinition[]): Promise<RunStats> {
    const stats: RunStats = { total: assets.length, generated: 0, cached: 0, failed: 0, skipped: 0 };
    const limit = pLimit(this.config.concurrency);

    await this.cache.init();
    await ensureDir(this.config.outputPath);

    log.info(`Starting generation: ${assets.length} assets, concurrency: ${this.config.concurrency}`);

    const tasks = assets.map(asset => limit(async () => {
      if (this.costTracker.isOverLimit()) {
        log.asset(asset.id, 'skipped (cost limit)');
        stats.skipped++;
        return;
      }

      try {
        await this.processOne(asset, stats);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.asset(asset.id, `failed: ${msg}`);
        stats.failed++;
      }
    }));

    await Promise.all(tasks);

    await this.costTracker.saveHistory(this.config.outputPath);

    log.info(`Done: ${stats.generated} generated, ${stats.cached} cached, ${stats.failed} failed, ${stats.skipped} skipped`);

    return stats;
  }

  private async processOne(asset: AssetDefinition, stats: RunStats): Promise<void> {
    const prompt = buildPrompt(asset, this.definitions);
    const promptHash = this.cache.getHash(prompt, {
      provider: 'openai',
      model: 'gpt-image-1',
      width: asset.generateWidth,
      height: asset.generateHeight,
    });

    // Check cache
    if (!this.force && await this.cache.has(asset.id, promptHash)) {
      log.asset(asset.id, 'cached');
      stats.cached++;
      return;
    }

    // Generate
    const rawPath = this.cache.getRawPath(asset.id, promptHash);
    await ensureDir(join(this.config.outputPath, 'raw'));

    log.asset(asset.id, 'generating...');

    const result = await this.provider.generate(prompt, rawPath, {
      width: asset.generateWidth,
      height: asset.generateHeight,
    });

    // Track cost
    this.costTracker.add(asset.id, result.cost, 'openai');

    // Cache the result
    await this.cache.set(asset.id, {
      promptHash,
      rawPath,
      prompt,
      provider: 'openai',
      timestamp: new Date().toISOString(),
      cost: result.cost,
    });

    // Post-process
    await this.processor.processAsset(asset, this.config, rawPath);

    log.asset(asset.id, 'generated');
    stats.generated++;
  }
}
