import { MASTER_STYLE, NEGATIVE_PROMPT, SIZE_HINTS, CHARACTER_POSES, ENEMY_POSES, BACKGROUND_INSTRUCTION } from './style-guide.js';
import type { AssetDefinition, BiomeDefinition, PaletteDefinition } from '../types.js';

interface LoadedDefinitions {
  assets: AssetDefinition[];
  biomes: Map<string, BiomeDefinition>;
  palettes: Map<string, PaletteDefinition>;
}

export function buildPrompt(asset: AssetDefinition, definitions: LoadedDefinitions): string {
  switch (asset.category) {
    case 'enemy':
      return buildEnemyPrompt(asset, definitions);
    case 'character':
      return buildCharacterPrompt(asset, definitions);
    case 'tileset':
      return buildTilesetPrompt(asset, definitions);
    case 'battle-background':
      return buildBattleBackgroundPrompt(asset, definitions);
    case 'portrait':
      return buildPortraitPrompt(asset, definitions);
    case 'icon':
    case 'ui':
      return buildUIPrompt(asset, definitions);
    default:
      return buildGenericPrompt(asset, definitions);
  }
}

function getSizeHint(size: number): string {
  const key = String(size);
  return SIZE_HINTS[key] || SIZE_HINTS['32'];
}

function getPalette(asset: AssetDefinition, definitions: LoadedDefinitions): PaletteDefinition | undefined {
  return definitions.palettes.get(asset.paletteId);
}

function getBiome(asset: AssetDefinition, definitions: LoadedDefinitions): BiomeDefinition | undefined {
  if (asset.biome) {
    return definitions.biomes.get(asset.biome);
  }
  return undefined;
}

function formatPaletteColors(palette: PaletteDefinition | undefined): string {
  if (!palette) return '';
  return `Use only these approximate colors: ${palette.colors.join(', ')}. Stay within this limited palette.`;
}

function formatVisualTraits(traits: string[]): string {
  if (traits.length === 0) return '';
  return traits.map(t => t.endsWith('.') ? t : t + '.').join(' ');
}

function buildEnemyPrompt(asset: AssetDefinition, definitions: LoadedDefinitions): string {
  const biome = getBiome(asset, definitions);
  const palette = getPalette(asset, definitions);
  const sizeHint = getSizeHint(asset.targetWidth);

  const parts: string[] = [
    `SNES 16-bit pixel art enemy sprite for a retro RPG battle screen.`,
    MASTER_STYLE,
    `This is "${asset.name}".`,
    asset.promptHints,
  ];

  if (asset.visualTraits.length > 0) {
    parts.push(`Visual traits: ${formatVisualTraits(asset.visualTraits)}`);
  }

  if (biome) {
    parts.push(`Biome context: ${biome.name} — ${biome.description}`);
  }

  if (asset.biomeContext) {
    parts.push(asset.biomeContext);
  }

  // Enemy faces right (toward the party on the right side)
  parts.push(`The enemy faces to the RIGHT, as it would appear on the LEFT side of a classic RPG battle screen.`);

  parts.push(`Sprite dimensions: ${asset.targetWidth}x${asset.targetHeight} pixels. ${sizeHint}`);
  parts.push(formatPaletteColors(palette));
  parts.push(BACKGROUND_INSTRUCTION);

  return parts.filter(Boolean).join('\n\n');
}

function buildCharacterPrompt(asset: AssetDefinition, definitions: LoadedDefinitions): string {
  const palette = getPalette(asset, definitions);
  const sizeHint = getSizeHint(asset.targetWidth);

  const parts: string[] = [
    `SNES 16-bit pixel art RPG character sprite.`,
    MASTER_STYLE,
    `Class: ${asset.className || 'Unknown'}. This is "${asset.name}".`,
    asset.promptHints,
  ];

  if (asset.visualTraits.length > 0) {
    parts.push(`Visual traits: ${formatVisualTraits(asset.visualTraits)}`);
  }

  // Character faces left (toward enemies on the left side)
  parts.push(`The character faces to the LEFT, standing on the RIGHT side of a classic RPG battle screen.`);

  parts.push(`Sprite dimensions: ${asset.targetWidth}x${asset.targetHeight} pixels. ${sizeHint}`);
  parts.push(formatPaletteColors(palette));
  parts.push(BACKGROUND_INSTRUCTION);

  return parts.filter(Boolean).join('\n\n');
}

function buildTilesetPrompt(asset: AssetDefinition, definitions: LoadedDefinitions): string {
  const biome = getBiome(asset, definitions);
  const palette = getPalette(asset, definitions);

  const parts: string[] = [
    `SNES 16-bit pixel art tileset tile, exactly ${asset.targetWidth}x${asset.targetHeight} pixels.`,
    MASTER_STYLE,
    asset.promptHints,
  ];

  if (biome) {
    parts.push(`Biome: ${biome.name} — ${biome.description}`);
  }

  parts.push(`The tile must be seamlessly tileable on all edges.`);
  parts.push(formatPaletteColors(palette));
  parts.push(BACKGROUND_INSTRUCTION);

  return parts.filter(Boolean).join('\n\n');
}

function buildBattleBackgroundPrompt(asset: AssetDefinition, definitions: LoadedDefinitions): string {
  const biome = getBiome(asset, definitions);
  const palette = getPalette(asset, definitions);

  const parts: string[] = [
    `SNES 16-bit pixel art battle background for a retro RPG.`,
    MASTER_STYLE,
    `Scene: ${asset.promptHints}`,
  ];

  if (biome) {
    parts.push(`Biome: ${biome.name} — ${biome.description}`);
  }

  parts.push(`This is a wide scene viewed from the side. The ground plane runs along the bottom third. The party will stand on the right, enemies on the left.`);
  parts.push(`Dimensions: ${asset.targetWidth}x${asset.targetHeight} pixels.`);
  parts.push(formatPaletteColors(palette));

  return parts.filter(Boolean).join('\n\n');
}

function buildPortraitPrompt(asset: AssetDefinition, definitions: LoadedDefinitions): string {
  const palette = getPalette(asset, definitions);

  const parts: string[] = [
    `SNES 16-bit pixel art character portrait for an RPG menu screen.`,
    MASTER_STYLE,
    `This is a close-up face portrait of "${asset.name}".`,
    asset.promptHints,
  ];

  if (asset.visualTraits.length > 0) {
    parts.push(`Visual traits: ${formatVisualTraits(asset.visualTraits)}`);
  }

  parts.push(`Portrait dimensions: ${asset.targetWidth}x${asset.targetHeight} pixels.`);
  parts.push(formatPaletteColors(palette));
  parts.push(BACKGROUND_INSTRUCTION);

  return parts.filter(Boolean).join('\n\n');
}

function buildUIPrompt(asset: AssetDefinition, definitions: LoadedDefinitions): string {
  const palette = getPalette(asset, definitions);

  const parts: string[] = [
    `SNES 16-bit pixel art UI element for a retro RPG.`,
    MASTER_STYLE,
    asset.promptHints,
  ];

  if (asset.visualTraits.length > 0) {
    parts.push(`Visual traits: ${formatVisualTraits(asset.visualTraits)}`);
  }

  parts.push(`Dimensions: ${asset.targetWidth}x${asset.targetHeight} pixels.`);
  parts.push(formatPaletteColors(palette));
  parts.push(BACKGROUND_INSTRUCTION);

  return parts.filter(Boolean).join('\n\n');
}

function buildGenericPrompt(asset: AssetDefinition, definitions: LoadedDefinitions): string {
  const palette = getPalette(asset, definitions);

  const parts: string[] = [
    `SNES 16-bit pixel art for a retro RPG.`,
    MASTER_STYLE,
    asset.promptHints,
  ];

  if (asset.visualTraits.length > 0) {
    parts.push(`Visual traits: ${formatVisualTraits(asset.visualTraits)}`);
  }

  parts.push(`Dimensions: ${asset.targetWidth}x${asset.targetHeight} pixels.`);
  parts.push(formatPaletteColors(palette));
  parts.push(BACKGROUND_INSTRUCTION);

  return parts.filter(Boolean).join('\n\n');
}
