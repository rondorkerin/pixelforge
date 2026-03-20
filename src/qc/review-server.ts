import express from 'express';
import { join } from 'path';
import { readdir } from 'fs/promises';
import { log } from '../logger.js';
import { fileExists } from '../utils.js';
import type { PixelForgeConfig } from '../types.js';

interface ReviewFilters {
  family?: string;
  category?: string;
  biome?: string;
}

export async function startReviewServer(
  config: PixelForgeConfig,
  port: number = 3333,
  filters: ReviewFilters = {}
): Promise<void> {
  const app = express();
  const processedDir = join(config.outputPath, 'processed');

  if (!await fileExists(processedDir)) {
    log.error('No processed assets found. Run generate first.');
    return;
  }

  // Serve processed images
  app.use('/assets', express.static(processedDir));

  // Main review page
  app.get('/', async (_req, res) => {
    const files = await readdir(processedDir);
    let pngFiles = files.filter(f => f.endsWith('.png') && !f.includes('_transparent') && !f.includes('_downscaled'));

    // Apply filters
    if (filters.family) {
      pngFiles = pngFiles.filter(f => f.includes(filters.family!));
    }
    if (filters.category) {
      pngFiles = pngFiles.filter(f => f.startsWith(filters.category!));
    }
    if (filters.biome) {
      pngFiles = pngFiles.filter(f => f.includes(filters.biome!));
    }

    pngFiles.sort();

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>PixelForge Review</title>
  <style>
    body { background: #1a1a2e; color: #eee; font-family: monospace; padding: 20px; }
    h1 { color: #e94560; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .card { background: #16213e; border-radius: 8px; padding: 12px; text-align: center; }
    .card img {
      image-rendering: pixelated;
      width: 128px;
      height: 128px;
      background: repeating-conic-gradient(#333 0% 25%, #444 0% 50%) 50% / 16px 16px;
    }
    .card .id { font-size: 11px; color: #a8a8a8; margin-top: 8px; word-break: break-all; }
    .filters { margin-bottom: 20px; }
    .filters input { background: #16213e; color: #eee; border: 1px solid #444; padding: 6px 12px; border-radius: 4px; font-family: monospace; }
    .count { color: #a8a8a8; margin-bottom: 16px; }
  </style>
</head>
<body>
  <h1>PixelForge Review</h1>
  <div class="filters">
    <input type="text" id="search" placeholder="Filter by ID..." oninput="filterCards()">
  </div>
  <div class="count">${pngFiles.length} assets</div>
  <div class="grid">
    ${pngFiles.map(f => {
      const id = f.replace('.png', '');
      return `<div class="card" data-id="${id}">
        <img src="/assets/${f}" alt="${id}">
        <div class="id">${id}</div>
      </div>`;
    }).join('\n    ')}
  </div>
  <script>
    function filterCards() {
      const q = document.getElementById('search').value.toLowerCase();
      document.querySelectorAll('.card').forEach(card => {
        card.style.display = card.dataset.id.includes(q) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;

    res.send(html);
  });

  app.listen(port, () => {
    log.success(`Review server running at http://localhost:${port}`);
    log.info('Press Ctrl+C to stop');
  });
}
