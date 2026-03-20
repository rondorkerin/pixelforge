import type { AssetDefinition, FilterOptions } from '../types.js';
import type { LoadedDefinitions } from './loader.js';

export function filterAssets(definitions: LoadedDefinitions, filters: FilterOptions): AssetDefinition[] {
  let assets = [...definitions.assets];

  // If a specific ID is given, return just that
  if (filters.id) {
    return assets.filter(a => a.id === filters.id);
  }

  // Filter by category
  if (filters.category) {
    const cat = filters.category.toLowerCase();
    if (cat === 'sprites') {
      assets = assets.filter(a => a.category === 'character' || a.category === 'enemy');
    } else if (cat === 'enemies') {
      assets = assets.filter(a => a.category === 'enemy');
    } else if (cat === 'characters') {
      assets = assets.filter(a => a.category === 'character');
    } else if (cat === 'tilesets') {
      assets = assets.filter(a => a.category === 'tileset');
    } else if (cat === 'battle-backgrounds') {
      assets = assets.filter(a => a.category === 'battle-background');
    } else if (cat === 'portraits') {
      assets = assets.filter(a => a.category === 'portrait');
    } else {
      assets = assets.filter(a => a.category === cat);
    }
  }

  // Filter by biome
  if (filters.biome) {
    assets = assets.filter(a => a.biome === filters.biome);
  }

  // Filter by class
  if (filters.className) {
    const cls = filters.className.toLowerCase();
    assets = assets.filter(a => a.className?.toLowerCase().includes(cls));
  }

  // Filter by enemy family
  if (filters.family) {
    assets = assets.filter(a => a.family === filters.family);
  }

  // Filter by status
  if (filters.status) {
    assets = assets.filter(a => a.status === filters.status);
  }

  // Filter by priority
  if (filters.priority) {
    assets = assets.filter(a => a.priority === filters.priority);
  }

  return assets;
}
