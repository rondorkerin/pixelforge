import sharp from 'sharp';
import { log } from '../logger.js';

interface LabColor {
  L: number;
  a: number;
  b: number;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Enforce a strict color palette on an image.
 * Each pixel is mapped to the nearest palette color using CIE76 delta-E
 * in CIELAB color space for perceptually accurate results.
 */
export async function enforcePalette(
  inputPath: string,
  outputPath: string,
  paletteHexColors: string[]
): Promise<void> {
  const paletteRgb = paletteHexColors.map(hexToRgb);
  const paletteLab = paletteRgb.map(rgbToLab);

  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  const { data } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });

  // Map each pixel to nearest palette color
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue; // Skip transparent pixels

    const pixelLab = rgbToLab({ r: data[i], g: data[i + 1], b: data[i + 2] });

    let minDist = Infinity;
    let nearestIdx = 0;

    for (let j = 0; j < paletteLab.length; j++) {
      const dist = deltaE76(pixelLab, paletteLab[j]);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = j;
      }
    }

    data[i] = paletteRgb[nearestIdx].r;
    data[i + 1] = paletteRgb[nearestIdx].g;
    data[i + 2] = paletteRgb[nearestIdx].b;
  }

  await sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outputPath);
}

/**
 * CIE76 color difference in CIELAB space.
 * Simple Euclidean distance -- fast and good enough for palette mapping.
 */
function deltaE76(lab1: LabColor, lab2: LabColor): number {
  return Math.sqrt(
    Math.pow(lab1.L - lab2.L, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  );
}

/**
 * Convert RGB to CIELAB via XYZ intermediate.
 * Uses D65 illuminant (standard daylight).
 */
function rgbToLab(rgb: RgbColor): LabColor {
  // Linearize sRGB
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // RGB to XYZ (D65)
  let x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  let y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / 1.00000;
  let z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;

  // XYZ to Lab
  x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

  return {
    L: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  };
}

function hexToRgb(hex: string): RgbColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}
