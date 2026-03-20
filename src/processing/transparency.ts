import sharp from 'sharp';
import { log } from '../logger.js';

/**
 * Remove the key color background and replace with transparency.
 * Uses a tolerance-based approach to handle slight color variations.
 */
export async function removeBackground(
  inputPath: string,
  outputPath: string,
  keyColor: string = '#FF00FF',
  tolerance: number = 30
): Promise<void> {
  const { r: keyR, g: keyG, b: keyB } = hexToRgb(keyColor);

  const image = sharp(inputPath);
  const { width, height, channels } = await image.metadata();

  if (!width || !height) throw new Error('Could not read image dimensions');

  // Get raw pixel data
  const { data } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });

  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const distance = Math.sqrt(
      Math.pow(r - keyR, 2) +
      Math.pow(g - keyG, 2) +
      Math.pow(b - keyB, 2)
    );

    if (distance <= tolerance) {
      data[i + 3] = 0; // Set alpha to transparent
    }
  }

  await sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outputPath);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}
