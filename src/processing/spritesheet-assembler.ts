import sharp from 'sharp';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { ensureDir } from '../utils.js';
import { log } from '../logger.js';
import type { AnimationSpec } from '../types.js';

interface SheetMetadata {
  texture: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  animations: Record<string, {
    row: number;
    frames: number;
    fps: number;
    loop: boolean;
  }>;
}

/**
 * Assemble a spritesheet from individual frame images.
 * Lays out frames in a grid: each animation on its own row.
 */
export async function assembleSpritesheet(
  framePaths: Map<string, string[]>, // animation name -> frame paths
  animations: AnimationSpec[],
  outputPath: string,
  frameWidth: number,
  frameHeight: number
): Promise<SheetMetadata> {
  // Calculate grid dimensions
  const maxFrames = Math.max(...animations.map(a => a.frameCount));
  const rows = animations.length;
  const cols = maxFrames;

  const sheetWidth = cols * frameWidth;
  const sheetHeight = rows * frameHeight;

  // Create empty sheet
  const composites: sharp.OverlayOptions[] = [];

  for (let row = 0; row < animations.length; row++) {
    const anim = animations[row];
    const frames = framePaths.get(anim.name) || [];

    for (let col = 0; col < frames.length; col++) {
      composites.push({
        input: frames[col],
        left: col * frameWidth,
        top: row * frameHeight,
      });
    }
  }

  await ensureDir(dirname(outputPath));

  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outputPath);

  // Build metadata
  const metadata: SheetMetadata = {
    texture: outputPath.split('/').pop()!,
    frameWidth,
    frameHeight,
    columns: cols,
    rows,
    animations: {},
  };

  for (let i = 0; i < animations.length; i++) {
    metadata.animations[animations[i].name] = {
      row: i,
      frames: animations[i].frameCount,
      fps: animations[i].fps,
      loop: animations[i].loop,
    };
  }

  // Save metadata JSON alongside the spritesheet
  const metaPath = outputPath.replace(/\.png$/, '.json');
  await writeFile(metaPath, JSON.stringify(metadata, null, 2));

  return metadata;
}

/**
 * Split a single image into a grid of frames.
 * Useful when AI generates a spritesheet-like image that needs to be extracted.
 */
export async function extractFrames(
  inputPath: string,
  outputDir: string,
  frameWidth: number,
  frameHeight: number,
  expectedFrames: number
): Promise<string[]> {
  await ensureDir(outputDir);

  const metadata = await sharp(inputPath).metadata();
  const imgWidth = metadata.width!;
  const imgHeight = metadata.height!;

  const cols = Math.floor(imgWidth / frameWidth);
  const rows = Math.floor(imgHeight / frameHeight);
  const totalFrames = Math.min(cols * rows, expectedFrames);

  const paths: string[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const framePath = join(outputDir, `frame_${String(i).padStart(3, '0')}.png`);

    await sharp(inputPath)
      .extract({
        left: col * frameWidth,
        top: row * frameHeight,
        width: frameWidth,
        height: frameHeight,
      })
      .png()
      .toFile(framePath);

    paths.push(framePath);
  }

  return paths;
}
