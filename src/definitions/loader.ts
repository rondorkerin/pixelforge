import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { parse as parseYaml } from 'yaml';
import { log } from '../logger.js';
import { fileExists } from '../utils.js';
import type {
  AssetDefinition, BiomeDefinition, PaletteDefinition,
  EnemyFamilyDefinition, CharacterSubclassDefinition, TileDefinition
} from '../types.js';

export interface LoadedDefinitions {
  assets: AssetDefinition[];
  biomes: Map<string, BiomeDefinition>;
  palettes: Map<string, PaletteDefinition>;
}

export async function loadDefinitions(definitionsPath: string): Promise<LoadedDefinitions> {
  const assets: AssetDefinition[] = [];
  const biomes = new Map<string, BiomeDefinition>();
  const palettes = new Map<string, PaletteDefinition>();

  if (!await fileExists(definitionsPath)) {
    log.warn(`Definitions path not found: ${definitionsPath}`);
    return { assets, biomes, palettes };
  }

  // Load biomes first (they contain palettes)
  const biomesDir = join(definitionsPath, 'biomes');
  if (await fileExists(biomesDir)) {
    const biomeFiles = await findYamlFiles(biomesDir);
    for (const file of biomeFiles) {
      const raw = await readYaml(file);
      if (raw?.biome) {
        const biome = raw.biome as BiomeDefinition;
        biomes.set(biome.id, biome);
        if (biome.palette) {
          palettes.set(biome.palette.id, biome.palette);
        }
      }
    }
  }

  // Load standalone palette files
  const palettesDir = join(definitionsPath, 'palettes');
  if (await fileExists(palettesDir)) {
    const paletteFiles = await findYamlFiles(palettesDir);
    for (const file of paletteFiles) {
      const raw = await readYaml(file);
      if (raw?.palette) {
        const p = raw.palette as PaletteDefinition;
        palettes.set(p.id, p);
      }
    }
  }

  // Load enemy families and expand into biome variants
  const enemiesDir = join(definitionsPath, 'enemies');
  if (await fileExists(enemiesDir)) {
    const enemyFiles = await findYamlFiles(enemiesDir);
    for (const file of enemyFiles) {
      const raw = await readYaml(file);
      if (raw?.families) {
        const families = raw.families as EnemyFamilyDefinition[];
        for (const family of families) {
          // Create one asset per biome variant
          for (const [biomeId, biome] of biomes) {
            const override = biome.enemyOverrides?.[family.id] || {};
            const assetId = `enemy-${biome.prefix.toLowerCase()}-${family.id}`;

            const asset: AssetDefinition = {
              id: assetId,
              category: 'enemy',
              name: `${biome.prefix} ${family.name}`,
              biome: biomeId,
              family: family.id,
              targetWidth: family.targetWidth || 32,
              targetHeight: family.targetHeight || 32,
              generateWidth: 1024,
              generateHeight: 1024,
              paletteId: biome.palette.id,
              promptHints: override.promptOverride || family.baseDescription,
              visualTraits: [
                ...family.visualTraits,
                ...(override.visualTraits || []),
              ],
              animations: family.animations,
              generationStrategy: 'single',
              priority: family.priority || 'medium',
              status: 'pending',
              biomeContext: `${biome.name} biome: ${biome.description}. ${override.colorShift ? `Color shift: ${override.colorShift}.` : ''}`,
            };
            assets.push(asset);
          }
        }
      }
      // Also handle individual enemy assets defined directly
      if (raw?.assets) {
        assets.push(...(raw.assets as AssetDefinition[]));
      }
    }
  }

  // Load character definitions
  const charsDir = join(definitionsPath, 'characters');
  if (await fileExists(charsDir)) {
    const charFiles = await findYamlFiles(charsDir);
    for (const file of charFiles) {
      const raw = await readYaml(file);
      if (raw?.subclasses) {
        const subclasses = raw.subclasses as CharacterSubclassDefinition[];
        const defaultPalette = (raw.paletteId as string) || 'default';
        for (const sub of subclasses) {
          const asset: AssetDefinition = {
            id: `character-${sub.id}`,
            category: 'character',
            name: sub.name,
            className: `${sub.baseClass} — ${sub.name}`,
            targetWidth: sub.targetWidth || 32,
            targetHeight: sub.targetHeight || 32,
            generateWidth: 1024,
            generateHeight: 1024,
            paletteId: defaultPalette,
            promptHints: sub.description,
            visualTraits: sub.visualTraits,
            animations: sub.animations,
            generationStrategy: 'single',
            priority: sub.priority || 'high',
            status: 'pending',
          };
          assets.push(asset);
        }
      }
    }
  }

  // Load tileset definitions from biome files
  for (const [biomeId, biome] of biomes) {
    const biomeFile = join(biomesDir, `${biomeId}.yaml`);
    if (await fileExists(biomeFile)) {
      const raw = await readYaml(biomeFile);
      const tiles = (raw?.biome as Record<string, unknown>)?.tileset
        ? ((raw!.biome as Record<string, unknown>).tileset as Record<string, unknown>).tiles as TileDefinition[] | undefined
        : undefined;
      if (tiles) {
        for (const tile of tiles) {
          const variantCount = tile.variants || 1;
          for (let v = 1; v <= variantCount; v++) {
            const variantSuffix = variantCount > 1 ? `-${String(v).padStart(2, '0')}` : '';
            const asset: AssetDefinition = {
              id: `tile-${biomeId}-${tile.name}${variantSuffix}`,
              category: 'tileset',
              name: `${biome.name} ${tile.name}${variantSuffix}`,
              biome: biomeId,
              targetWidth: 32,
              targetHeight: 32,
              generateWidth: 1024,
              generateHeight: 1024,
              paletteId: biome.palette.id,
              promptHints: tile.promptHint,
              visualTraits: [],
              animations: tile.animated && tile.frameCount ? [{
                name: 'animate',
                frameCount: tile.frameCount,
                fps: 4,
                loop: true,
              }] : [],
              generationStrategy: 'single',
              priority: 'medium',
              status: 'pending',
              biomeContext: `${biome.name} biome: ${biome.description}`,
            };
            assets.push(asset);
          }
        }
      }
    }
  }

  // Load UI definitions
  const uiDir = join(definitionsPath, 'ui');
  if (await fileExists(uiDir)) {
    const uiFiles = await findYamlFiles(uiDir);
    for (const file of uiFiles) {
      const raw = await readYaml(file);
      if (raw?.assets) {
        assets.push(...(raw.assets as AssetDefinition[]));
      }
    }
  }

  // Load battle backgrounds from biome data
  for (const [biomeId, biome] of biomes) {
    const biomeFile = join(biomesDir, `${biomeId}.yaml`);
    if (await fileExists(biomeFile)) {
      const raw = await readYaml(biomeFile);
      const bg = (raw?.biome as Record<string, unknown>)?.battleBackground as
        Record<string, unknown> | undefined;
      if (bg) {
        assets.push({
          id: `bg-${biomeId}`,
          category: 'battle-background',
          name: `${biome.name} Battle Background`,
          biome: biomeId,
          targetWidth: (bg.width as number) || 256,
          targetHeight: (bg.height as number) || 160,
          generateWidth: 1024,
          generateHeight: 1024,
          paletteId: biome.palette.id,
          promptHints: (bg.description as string) || `Battle scene in ${biome.name}`,
          visualTraits: (bg.visualTraits as string[]) || [],
          animations: [],
          generationStrategy: 'single',
          priority: 'medium',
          status: 'pending',
          biomeContext: `${biome.name}: ${biome.description}`,
        });
      }
    }
  }

  log.info(`Loaded ${assets.length} assets, ${biomes.size} biomes, ${palettes.size} palettes`);
  return { assets, biomes, palettes };
}

async function findYamlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isFile() && (extname(entry.name) === '.yaml' || extname(entry.name) === '.yml')) {
      files.push(fullPath);
    } else if (entry.isDirectory()) {
      files.push(...await findYamlFiles(fullPath));
    }
  }
  return files;
}

async function readYaml(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return parseYaml(content) as Record<string, unknown>;
  } catch (err) {
    log.warn(`Failed to parse YAML: ${filePath}`);
    return null;
  }
}
