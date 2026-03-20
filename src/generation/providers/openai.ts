import OpenAI from 'openai';
import { writeFile } from 'fs/promises';
import { ensureDir } from '../../utils.js';
import { dirname } from 'path';
import { log } from '../../logger.js';

export class OpenAIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generate(prompt: string, outputPath: string, options: {
    width?: number;
    height?: number;
    quality?: 'low' | 'medium' | 'high' | 'auto';
  } = {}): Promise<{ cost: number }> {
    const size = this.getSize(options.width || 1024, options.height || 1024);

    await ensureDir(dirname(outputPath));

    const response = await this.client.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size,
      quality: options.quality || 'medium',
    });

    const imageData = response.data?.[0];
    if (!imageData?.b64_json) {
      throw new Error('No image data in response');
    }

    const buffer = Buffer.from(imageData.b64_json, 'base64');
    await writeFile(outputPath, buffer);

    const cost = this.estimateCost(size, options.quality || 'medium');

    return { cost };
  }

  private getSize(width: number, height: number): '1024x1024' | '1024x1536' | '1536x1024' | 'auto' {
    // gpt-image-1 supports these sizes
    if (width === height) return '1024x1024';
    if (width > height) return '1536x1024';
    return '1024x1536';
  }

  private estimateCost(size: string, quality: string): number {
    // Approximate costs for gpt-image-1
    const costs: Record<string, Record<string, number>> = {
      'low': { '1024x1024': 0.011, '1024x1536': 0.016, '1536x1024': 0.016 },
      'medium': { '1024x1024': 0.042, '1024x1536': 0.063, '1536x1024': 0.063 },
      'high': { '1024x1024': 0.167, '1024x1536': 0.250, '1536x1024': 0.250 },
    };
    return costs[quality]?.[size] ?? 0.042;
  }
}
