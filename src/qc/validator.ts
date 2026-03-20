import sharp from 'sharp';
import { stat } from 'fs/promises';
import { join } from 'path';
import { log } from '../logger.js';
import { fileExists } from '../utils.js';
import type { AssetDefinition, PixelForgeConfig } from '../types.js';

interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
}

interface ValidationResult {
  assetId: string;
  passed: boolean;
  checks: ValidationCheck[];
}

export async function validate(
  assets: AssetDefinition[],
  config: PixelForgeConfig,
  strict: boolean = false
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  for (const asset of assets) {
    const filePath = join(config.outputPath, 'processed', `${asset.id}.png`);
    const result = await validateAsset(asset, filePath, strict);
    results.push(result);

    if (result.passed) {
      log.asset(asset.id, 'passed');
    } else {
      const failures = result.checks.filter(c => !c.passed);
      for (const f of failures) {
        log.asset(asset.id, `FAIL: ${f.name} — ${f.message}`);
      }
    }
  }

  return results;
}

async function validateAsset(
  asset: AssetDefinition,
  filePath: string,
  strict: boolean
): Promise<ValidationResult> {
  const checks: ValidationCheck[] = [];

  // Check file exists
  const exists = await fileExists(filePath);
  checks.push({
    name: 'file-exists',
    passed: exists,
    message: exists ? 'OK' : `File not found: ${filePath}`,
  });

  if (!exists) {
    return { assetId: asset.id, passed: false, checks };
  }

  try {
    const metadata = await sharp(filePath).metadata();
    const { width, height, channels } = metadata;

    // Check dimensions
    const dimOk = width === asset.targetWidth && height === asset.targetHeight;
    checks.push({
      name: 'dimensions',
      passed: dimOk,
      message: dimOk
        ? `OK (${width}x${height})`
        : `Expected ${asset.targetWidth}x${asset.targetHeight}, got ${width}x${height}`,
    });

    // Check has alpha channel (transparency)
    const hasAlpha = channels === 4;
    checks.push({
      name: 'transparency',
      passed: hasAlpha,
      message: hasAlpha ? 'OK (RGBA)' : 'Missing alpha channel',
    });

    // Check file size (not suspiciously small)
    const fileStat = await stat(filePath);
    const sizeOk = fileStat.size > 100; // At least 100 bytes
    checks.push({
      name: 'file-size',
      passed: sizeOk,
      message: sizeOk ? `OK (${fileStat.size} bytes)` : `Suspiciously small: ${fileStat.size} bytes`,
    });

    // Check unique colors (should be <= palette limit if palette-enforced)
    const { data } = await sharp(filePath).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const colorSet = new Set<string>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) { // Skip transparent pixels
        colorSet.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      }
    }
    const colorCount = colorSet.size;
    const colorOk = !strict || colorCount <= 16;
    checks.push({
      name: 'color-count',
      passed: colorOk,
      message: `${colorCount} unique colors${colorCount > 16 ? ' (exceeds 16-color limit)' : ''}`,
    });

  } catch (err) {
    checks.push({
      name: 'readable',
      passed: false,
      message: `Could not read image: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  const passed = checks.every(c => c.passed);
  return { assetId: asset.id, passed, checks };
}
