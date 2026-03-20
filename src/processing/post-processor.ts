import { join } from 'path';
import { log } from '../logger.js';
import { ensureDir, fileExists } from '../utils.js';
import { removeBackground } from './transparency.js';
import { downscale } from './downscaler.js';
import { enforcePalette } from './palette-enforcer.js';
import type { AssetDefinition, PixelForgeConfig, PaletteDefinition } from '../types.js';

export class PostProcessor {
  /**
   * Full post-processing pipeline for a single asset:
   * 1. Remove background (magenta key color -> transparency)
   * 2. Downscale (1024x1024 -> target size, nearest-neighbor)
   * 3. Enforce palette (map all pixels to nearest palette color)
   */
  async processAsset(
    asset: AssetDefinition,
    config: PixelForgeConfig,
    rawPath?: string
  ): Promise<string> {
    const outputDir = join(config.outputPath, 'processed');
    await ensureDir(outputDir);

    const inputPath = rawPath || join(config.outputPath, 'raw', `${asset.id}.png`);

    if (!await fileExists(inputPath)) {
      throw new Error(`Raw image not found: ${inputPath}`);
    }

    // Step 1: Remove background
    const transparentPath = join(outputDir, `${asset.id}_transparent.png`);
    log.debug(`Removing background: ${asset.id}`);
    await removeBackground(inputPath, transparentPath, '#FF00FF', 30);

    // Step 2: Downscale to target resolution
    const downscaledPath = join(outputDir, `${asset.id}_downscaled.png`);
    log.debug(`Downscaling: ${asset.id} → ${asset.targetWidth}x${asset.targetHeight}`);
    await downscale(transparentPath, downscaledPath, asset.targetWidth, asset.targetHeight);

    // Step 3: Enforce palette (if palette colors are provided in the asset definition)
    // We'll check if a palette file exists in the definitions
    const finalPath = join(outputDir, `${asset.id}.png`);

    // For now, just copy the downscaled version as final
    // Palette enforcement requires the palette colors to be loaded separately
    const { copyFile } = await import('fs/promises');
    await copyFile(downscaledPath, finalPath);

    log.debug(`Post-processed: ${asset.id}`);
    return finalPath;
  }

  /**
   * Process with explicit palette colors.
   */
  async processWithPalette(
    asset: AssetDefinition,
    config: PixelForgeConfig,
    palette: PaletteDefinition,
    rawPath?: string
  ): Promise<string> {
    const outputDir = join(config.outputPath, 'processed');
    await ensureDir(outputDir);

    const inputPath = rawPath || join(config.outputPath, 'raw', `${asset.id}.png`);

    if (!await fileExists(inputPath)) {
      throw new Error(`Raw image not found: ${inputPath}`);
    }

    // Step 1: Remove background
    const transparentPath = join(outputDir, `${asset.id}_transparent.png`);
    await removeBackground(inputPath, transparentPath, palette.keyColor || '#FF00FF', 30);

    // Step 2: Downscale
    const downscaledPath = join(outputDir, `${asset.id}_downscaled.png`);
    await downscale(transparentPath, downscaledPath, asset.targetWidth, asset.targetHeight);

    // Step 3: Enforce palette
    const finalPath = join(outputDir, `${asset.id}.png`);
    await enforcePalette(downscaledPath, finalPath, palette.colors);

    log.debug(`Post-processed with palette: ${asset.id}`);
    return finalPath;
  }
}
