#!/usr/bin/env node
import { Command } from 'commander';
import { loadConfig } from './config.js';
import { setVerbose, log } from './logger.js';
import { loadDefinitions } from './definitions/loader.js';
import { filterAssets } from './definitions/filter.js';
import { BatchRunner } from './generation/batch-runner.js';
import { CacheManager } from './generation/cache.js';
import { CostTracker } from './generation/cost-tracker.js';
import { OpenAIProvider } from './generation/providers/openai.js';
import { buildPrompt } from './prompts/template-engine.js';
import { PostProcessor } from './processing/post-processor.js';
import { exportToTarget } from './output/exporter.js';
import { validate } from './qc/validator.js';
import { startReviewServer } from './qc/review-server.js';
import type { FilterOptions, PixelForgeConfig } from './types.js';

const program = new Command();

program
  .name('pixelforge')
  .description('AI-powered pixel art pipeline for retro games')
  .version('0.1.0')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--definitions <path>', 'Path to YAML definitions directory')
  .option('--output <path>', 'Output directory')
  .option('--config <path>', 'Config file path');

program
  .command('generate')
  .description('Generate assets from YAML definitions')
  .option('--all', 'Generate all defined assets')
  .option('--category <name>', 'Filter by category')
  .option('--biome <name>', 'Filter by biome')
  .option('--class <name>', 'Filter by character class')
  .option('--family <name>', 'Filter by enemy family')
  .option('--id <id>', 'Generate a specific asset by ID')
  .option('--animation <name>', 'Filter by animation name')
  .option('--type <name>', 'Sub-category filter')
  .option('--force', 'Bypass cache, regenerate')
  .option('--status <status>', 'Filter by status')
  .option('--dry-run', 'Preview without generating')
  .option('--priority <level>', 'Filter by priority')
  .option('--cost-limit <amount>', 'Cap spending for this session', parseFloat)
  .option('--concurrency <n>', 'Parallel API calls', parseInt)
  .action(async (opts) => {
    const globalOpts = program.opts();
    if (globalOpts.verbose) setVerbose(true);

    const config = loadConfig({
      definitionsPath: globalOpts.definitions,
      outputPath: globalOpts.output,
      costLimit: opts.costLimit,
      concurrency: opts.concurrency,
    });

    if (!config.openaiApiKey) {
      log.error('OPENAI_API_KEY not set. Add it to .env or export it.');
      process.exit(1);
    }

    const filters: FilterOptions = {
      all: opts.all,
      category: opts.category,
      biome: opts.biome,
      className: opts.class,
      family: opts.family,
      id: opts.id,
      animation: opts.animation,
      type: opts.type,
      force: opts.force,
      status: opts.status,
      dryRun: opts.dryRun,
      priority: opts.priority,
      costLimit: opts.costLimit,
    };

    if (!filters.all && !filters.category && !filters.biome && !filters.className &&
        !filters.family && !filters.id && !filters.type && !filters.status && !filters.priority) {
      log.error('Specify --all or a filter (--category, --biome, --family, --id, etc.)');
      process.exit(1);
    }

    log.header('PixelForge — Generate');

    const definitions = await loadDefinitions(config.definitionsPath);
    const assets = filterAssets(definitions, filters);

    log.info(`Found ${assets.length} assets matching filters`);

    if (assets.length === 0) {
      log.warn('No assets match your filters.');
      return;
    }

    if (filters.dryRun) {
      log.info('Dry run — no API calls will be made');
      for (const asset of assets) {
        const prompt = buildPrompt(asset, definitions);
        console.log();
        console.log(chalk.bold(asset.id));
        console.log(chalk.dim(prompt.slice(0, 200) + '...'));
      }
      const estimatedCost = assets.length * 0.04;
      log.info(`Estimated cost: $${estimatedCost.toFixed(2)} (${assets.length} API calls)`);
      return;
    }

    const cache = new CacheManager(config.cachePath);
    const costTracker = new CostTracker(config.costLimit);
    const provider = new OpenAIProvider(config.openaiApiKey);
    const processor = new PostProcessor();

    const runner = new BatchRunner({
      config,
      cache,
      costTracker,
      provider,
      processor,
      definitions,
      force: filters.force || false,
    });

    await runner.run(assets);

    log.header('Summary');
    costTracker.printSummary();
  });

program
  .command('process')
  .description('Re-run post-processing on raw images (no API calls)')
  .option('--all', 'Process all raw images')
  .option('--id <id>', 'Process specific asset')
  .action(async (opts) => {
    const globalOpts = program.opts();
    if (globalOpts.verbose) setVerbose(true);
    const config = loadConfig({ definitionsPath: globalOpts.definitions, outputPath: globalOpts.output });

    log.header('PixelForge — Post-Process');

    const definitions = await loadDefinitions(config.definitionsPath);
    const assets = filterAssets(definitions, { all: opts.all, id: opts.id });
    const processor = new PostProcessor();

    for (const asset of assets) {
      await processor.processAsset(asset, config);
    }

    log.success(`Processed ${assets.length} assets`);
  });

program
  .command('export')
  .description('Export processed assets to target directory')
  .option('--target <path>', 'Target export directory')
  .option('--format <fmt>', 'Export format: godot, flat', 'godot')
  .action(async (opts) => {
    const globalOpts = program.opts();
    if (globalOpts.verbose) setVerbose(true);
    const config = loadConfig({
      definitionsPath: globalOpts.definitions,
      outputPath: globalOpts.output,
      exportPath: opts.target,
    });

    log.header('PixelForge — Export');
    const definitions = await loadDefinitions(config.definitionsPath);
    await exportToTarget(definitions, config, opts.format);
  });

program
  .command('review')
  .description('Launch review server for visual QA')
  .option('--port <n>', 'Server port', parseInt, 3333)
  .option('--family <name>', 'Filter to enemy family')
  .option('--category <name>', 'Filter to category')
  .option('--biome <name>', 'Filter to biome')
  .action(async (opts) => {
    const globalOpts = program.opts();
    const config = loadConfig({ definitionsPath: globalOpts.definitions, outputPath: globalOpts.output });

    log.header('PixelForge — Review Server');
    await startReviewServer(config, opts.port, {
      family: opts.family,
      category: opts.category,
      biome: opts.biome,
    });
  });

program
  .command('validate')
  .description('Run quality checks on generated assets')
  .option('--all', 'Validate all assets')
  .option('--id <id>', 'Validate specific asset')
  .option('--strict', 'Fail on warnings')
  .action(async (opts) => {
    const globalOpts = program.opts();
    if (globalOpts.verbose) setVerbose(true);
    const config = loadConfig({ definitionsPath: globalOpts.definitions, outputPath: globalOpts.output });

    log.header('PixelForge — Validate');
    const definitions = await loadDefinitions(config.definitionsPath);
    const assets = filterAssets(definitions, { all: opts.all, id: opts.id });
    const results = await validate(assets, config, opts.strict);

    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;

    if (failed > 0) {
      log.error(`${failed} assets failed validation`);
      process.exit(1);
    } else {
      log.success(`All ${passed} assets passed validation`);
    }
  });

program
  .command('status')
  .description('Show generation status summary')
  .option('--category <name>', 'Filter to category')
  .action(async (opts) => {
    const globalOpts = program.opts();
    const config = loadConfig({ definitionsPath: globalOpts.definitions, outputPath: globalOpts.output });

    log.header('PixelForge — Status');
    const definitions = await loadDefinitions(config.definitionsPath);
    const assets = filterAssets(definitions, { all: true, category: opts.category });
    const cache = new CacheManager(config.cachePath);

    const counts = { pending: 0, generated: 0, approved: 0, rejected: 0 };
    for (const asset of assets) {
      const cached = await cache.has(asset.id);
      if (cached) {
        counts.generated++;
      } else {
        counts.pending++;
      }
    }

    console.log(`  Pending:   ${counts.pending}`);
    console.log(`  Generated: ${counts.generated}`);
    console.log(`  Total:     ${assets.length}`);
  });

program
  .command('cost')
  .description('Show cost tracking summary')
  .action(async () => {
    const config = loadConfig();
    const costTracker = new CostTracker(config.costLimit);
    await costTracker.loadHistory(config.outputPath);
    costTracker.printSummary();
  });

// Need to import chalk at top since it's used in generate dry-run
import chalk from 'chalk';

program.parse();
