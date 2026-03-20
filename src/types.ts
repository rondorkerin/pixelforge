import { z } from 'zod';

// === Enums ===

export const AssetCategory = z.enum([
  'character', 'enemy', 'tileset', 'ui', 'battle-background',
  'portrait', 'icon', 'music', 'sfx'
]);
export type AssetCategory = z.infer<typeof AssetCategory>;

export const AssetStatus = z.enum(['pending', 'generated', 'approved', 'rejected']);
export type AssetStatus = z.infer<typeof AssetStatus>;

export const AssetPriority = z.enum(['critical', 'high', 'medium', 'low']);
export type AssetPriority = z.infer<typeof AssetPriority>;

export const GenerationStrategy = z.enum(['per-frame', 'spritesheet', 'single']);
export type GenerationStrategy = z.infer<typeof GenerationStrategy>;

// === Animation ===

export const AnimationSpec = z.object({
  name: z.string(),
  frameCount: z.number().int().positive(),
  frameWidth: z.number().int().positive().optional(),
  frameHeight: z.number().int().positive().optional(),
  fps: z.number().positive().default(6),
  loop: z.boolean().default(true),
});
export type AnimationSpec = z.infer<typeof AnimationSpec>;

// === Palette ===

export const PaletteDefinition = z.object({
  id: z.string(),
  name: z.string(),
  colors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).min(1).max(256),
  description: z.string().optional(),
  keyColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#FF00FF'),
});
export type PaletteDefinition = z.infer<typeof PaletteDefinition>;

// === Asset Definition ===

export const AssetDefinition = z.object({
  id: z.string(),
  category: AssetCategory,
  name: z.string(),
  biome: z.string().optional(),
  family: z.string().optional(),
  className: z.string().optional(),

  // Dimensions
  targetWidth: z.number().int().positive().default(32),
  targetHeight: z.number().int().positive().default(32),
  generateWidth: z.number().int().positive().default(1024),
  generateHeight: z.number().int().positive().default(1024),

  // Visual
  paletteId: z.string(),
  promptHints: z.string(),
  visualTraits: z.array(z.string()).default([]),
  negativePrompt: z.string().optional(),

  // Animation
  animations: z.array(AnimationSpec).default([]),
  generationStrategy: GenerationStrategy.default('single'),

  // Metadata
  priority: AssetPriority.default('medium'),
  status: AssetStatus.default('pending'),

  // Extra prompt context
  styleOverride: z.string().optional(),
  biomeContext: z.string().optional(),
});
export type AssetDefinition = z.infer<typeof AssetDefinition>;

// === Biome Definition ===

export const BiomeDefinition = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  element: z.string(),
  description: z.string(),
  palette: PaletteDefinition,
  enemyOverrides: z.record(z.string(), z.object({
    promptOverride: z.string().optional(),
    colorShift: z.string().optional(),
    visualTraits: z.array(z.string()).optional(),
  })).default({}),
});
export type BiomeDefinition = z.infer<typeof BiomeDefinition>;

// === Enemy Family Definition ===

export const EnemyFamilyDefinition = z.object({
  id: z.string(),
  name: z.string(),
  archetype: z.string(),
  baseDescription: z.string(),
  visualTraits: z.array(z.string()),
  signatureMechanic: z.string().optional(),
  animations: z.array(AnimationSpec),
  targetWidth: z.number().int().positive().default(32),
  targetHeight: z.number().int().positive().default(32),
  priority: AssetPriority.default('medium'),
});
export type EnemyFamilyDefinition = z.infer<typeof EnemyFamilyDefinition>;

// === Character Definition ===

export const CharacterSubclassDefinition = z.object({
  id: z.string(),
  name: z.string(),
  className: z.string(),
  baseClass: z.string(),
  description: z.string(),
  visualTraits: z.array(z.string()),
  equipmentHints: z.string().optional(),
  animations: z.array(AnimationSpec),
  targetWidth: z.number().int().positive().default(32),
  targetHeight: z.number().int().positive().default(32),
  priority: AssetPriority.default('high'),
});
export type CharacterSubclassDefinition = z.infer<typeof CharacterSubclassDefinition>;

// === Tileset Definition ===

export const TileDefinition = z.object({
  name: z.string(),
  promptHint: z.string(),
  variants: z.number().int().positive().default(1),
  type: z.enum(['terrain', 'nature', 'structure', 'transition', 'special']).default('terrain'),
  animated: z.boolean().default(false),
  frameCount: z.number().int().positive().optional(),
  tileable: z.boolean().default(true),
});
export type TileDefinition = z.infer<typeof TileDefinition>;

// === Generation Result ===

export const GenerationResult = z.object({
  assetId: z.string(),
  promptHash: z.string(),
  provider: z.string(),
  model: z.string(),
  rawPath: z.string(),
  processedPath: z.string().optional(),
  cost: z.number().default(0),
  timestamp: z.string(),
  prompt: z.string(),
  cached: z.boolean().default(false),
});
export type GenerationResult = z.infer<typeof GenerationResult>;

// === Config ===

export interface PixelForgeConfig {
  openaiApiKey: string;
  provider: string;
  concurrency: number;
  costLimit: number;
  definitionsPath: string;
  outputPath: string;
  cachePath: string;
  exportPath: string;
}

// === Filter Options ===

export interface FilterOptions {
  all?: boolean;
  category?: string;
  biome?: string;
  className?: string;
  family?: string;
  id?: string;
  animation?: string;
  type?: string;
  force?: boolean;
  status?: string;
  dryRun?: boolean;
  priority?: string;
  costLimit?: number;
}
