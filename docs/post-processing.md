# Post-Processing Pipeline

Post-processing is the core of what makes PixelForge produce authentic pixel art instead of generic AI images. Raw API output is 1024x1024 and uses unlimited colors on arbitrary backgrounds. The post-processing pipeline transforms this into game-ready pixel art with strict constraints.

The pipeline runs these steps in order:

```
Raw 1024x1024 Image
  → Background Removal
  → Nearest-Neighbor Downscale
  → Palette Enforcement
  → Spritesheet / Tileset Assembly
  → Quality Validation
```

Each step can be individually skipped using `pixelforge process --skip-*` flags if needed.

---

## Background Removal

**Goal:** Replace the solid background color with transparency so sprites composit cleanly in-game.

### How It Works

1. PixelForge uses a **key color** approach. The default key color is magenta (`#FF00FF`), which is the standard transparency key in pixel art.
2. The prompt instructs the AI model to render the subject on a solid magenta background.
3. A **flood-fill algorithm** starts from all four corners of the image and marks connected pixels that match the key color (within a configurable tolerance).
4. Matched pixels are set to fully transparent (`alpha = 0`).
5. Interior pixels that happen to match the key color are not removed because the flood-fill only reaches pixels connected to the image border.

### Configuration

```yaml
# pixelforge.config.yaml
postProcessing:
  backgroundRemoval:
    enabled: true
    keyColor: "#FF00FF"    # Any hex color
    tolerance: 30          # Color distance tolerance (0-255 per channel)
```

### Why Flood-Fill Instead of Color Matching

A naive "replace all pixels matching the key color" approach would also remove any interior pixels that happen to be close to magenta. Flood-fill from corners ensures only the connected background region is removed, preserving any magenta-adjacent colors within the sprite itself.

### Edge Cases

- **Sprites touching image edges** — The subject should have at least 1px of background on all sides. PixelForge's prompt engineering handles this by instructing the model to center the subject with padding.
- **Semi-transparent edges** — AI models sometimes produce anti-aliased edges. The tolerance parameter controls how aggressively edge pixels are removed. For crisp pixel art, a low tolerance (10-30) works well.

---

## Nearest-Neighbor Downscaling

**Goal:** Reduce the 1024x1024 raw image to the target size (e.g., 32x32) while preserving crisp pixel edges.

### Why Nearest-Neighbor

Standard image scaling algorithms (bicubic, bilinear, Lanczos) produce smooth gradients between pixels. This is desirable for photographs but destructive for pixel art — it creates blurry, muddy-looking sprites where clean edges should be.

Nearest-neighbor scaling picks the single closest source pixel for each output pixel, preserving hard edges:

```
Bicubic (bad for pixel art):     Nearest-Neighbor (correct):
┌──────────────┐                 ┌──────────────┐
│ ░░▒▒▓▓██     │                 │ ░░  ▓▓██     │
│ ░░▒▒▓▓██     │                 │              │
│ ▒▒▓▓████     │                 │ ▒▒▓▓████     │
│              │                 │              │
└──────────────┘                 └──────────────┘
  (blurred edges)                  (crisp edges)
```

### Scale Ratios

The raw output is always 1024x1024. The scale factor is determined by the asset's `targetWidth` and `targetHeight`:

| Target Size | Scale Factor | Effective "Pixel" in Raw Image |
|-------------|-------------|-------------------------------|
| 16x16 | 64x | Each output pixel = 64x64 block in raw |
| 32x32 | 32x | Each output pixel = 32x32 block in raw |
| 48x48 | ~21x | Each output pixel = ~21x21 block in raw |
| 64x64 | 16x | Each output pixel = 16x16 block in raw |
| 128x128 | 8x | Each output pixel = 8x8 block in raw |
| 256x128 | 4x x 8x | Non-square scaling for backgrounds |

### Non-Square Assets

For non-square targets (e.g., battle backgrounds at 256x128), the prompt instructs the model to compose within the correct aspect ratio inside the 1024x1024 canvas, and downscaling respects the different x/y scale factors.

---

## Palette Enforcement

**Goal:** Clamp every pixel's color to the nearest color in the asset's assigned palette, enforcing a strict N-color limit.

This is the step that gives generated art its retro authenticity. Real retro hardware had strict color limits (NES: 25 colors, SNES: 256, Game Boy: 4). Palette enforcement recreates that constraint.

### CIE76 Perceptual Color Distance

PixelForge does not use simple RGB Euclidean distance to find the nearest palette color. RGB distance does not match human color perception — two colors that look very different can be close in RGB space, and vice versa.

Instead, PixelForge uses **CIE76 (Delta E)** in the **CIELAB color space**:

1. Convert the source pixel from RGB to CIELAB (L\*a\*b\*).
2. Convert each palette color from RGB to CIELAB.
3. Compute the Euclidean distance in Lab space: `deltaE = sqrt((L1-L2)^2 + (a1-a2)^2 + (b1-b2)^2)`
4. Assign the palette color with the smallest deltaE.

### Why CIELAB Matters

| Color Pair | RGB Distance | CIE76 Distance | Perceived |
|------------|-------------|----------------|-----------|
| Dark red vs. dark green | Small (~60) | Large (~50) | Very different |
| Light blue vs. light cyan | Large (~180) | Small (~15) | Very similar |
| Pure yellow vs. olive | Medium (~130) | Large (~40) | Quite different |

CIELAB was designed so that equal distances in the space correspond to equal perceived differences. This means palette enforcement produces results that look natural to the human eye rather than introducing jarring color substitutions.

### Configurable Distance Metrics

While CIE76 is the default and recommended metric, PixelForge supports alternatives:

```yaml
postProcessing:
  palette:
    distanceMetric: cie76      # Fast, good enough for most cases (default)
    # distanceMetric: cie94    # Better for saturated colors
    # distanceMetric: ciede2000 # Most accurate, but slower
```

### Color Count

Palettes are typically 4-16 colors. The palette definition controls the exact colors available. There is no hard limit on palette size, but smaller palettes produce a more authentic retro look.

### Transparent Pixels

Transparent pixels (alpha = 0, created by background removal) are not modified by palette enforcement. They remain fully transparent.

### Performance

Palette enforcement processes every non-transparent pixel in the downscaled image. For a 32x32 sprite with 16 palette colors, that is at most 1024 pixels x 16 comparisons = 16,384 distance calculations per frame. This runs in under 1ms per frame.

---

## Spritesheet Assembly

**Goal:** Combine individual animation frames into a single spritesheet image and emit metadata JSON.

### Grid Layout

Frames are arranged in a grid, left-to-right, top-to-bottom, in animation order:

```
┌──────┬──────┬──────┬──────┬──────┐
│idle-0│idle-1│atk-0 │atk-1 │atk-2 │
├──────┼──────┼──────┼──────┼──────┤
│hurt-0│die-0 │die-1 │die-2 │die-3 │
└──────┴──────┴──────┴──────┴──────┘
```

The number of columns is chosen to approximate a square aspect ratio for the sheet. You can override this with the `columns` field in the definition.

### Metadata Format

Each spritesheet is accompanied by a `.json` metadata file:

```json
{
  "id": "frost-dragon",
  "frameWidth": 32,
  "frameHeight": 32,
  "totalFrames": 10,
  "columns": 5,
  "rows": 2,
  "animations": {
    "idle": {
      "startFrame": 0,
      "frameCount": 2,
      "fps": 8,
      "loop": true
    },
    "attack": {
      "startFrame": 2,
      "frameCount": 3,
      "fps": 10,
      "loop": false
    },
    "hurt": {
      "startFrame": 5,
      "frameCount": 1,
      "fps": 8,
      "loop": true
    },
    "death": {
      "startFrame": 6,
      "frameCount": 4,
      "fps": 6,
      "loop": false
    }
  }
}
```

This format is engine-agnostic. Game engines can parse it to set up `AnimatedSprite` nodes, `SpriteRenderer` components, or equivalent.

### Static Assets

Assets without animations produce a single image file with no spritesheet metadata. They are just a processed PNG at the target dimensions.

---

## Tileset Assembly

**Goal:** Pack individual tiles into a tileset grid and emit compatibility metadata.

### Grid Packing

Tiles are packed into a grid with a configurable number of columns. Each tile occupies exactly `tileWidth x tileHeight` pixels with no padding between tiles (standard for tile engines).

```
columns = 8, tileWidth = 16, tileHeight = 16

┌────┬────┬────┬────┬────┬────┬────┬────┐
│grs0│grs1│grs2│dirt│dirt│tree│tree│watr│
├────┼────┼────┼────┼────┼────┼────┼────┤
│watr│stne│flr0│flr1│bush│    │    │    │
└────┴────┴────┴────┴────┴────┴────┴────┘
```

Tile variants are placed sequentially. If `grass` has 3 variants, they occupy indices 0, 1, 2.

### Godot Compatibility

When `godotCompatible: true` (the default for tilesets), PixelForge emits a `.tres` Godot TileSet resource file alongside the tileset image:

```tres
[gd_resource type="TileSet" format=3]

[ext_resource type="Texture2D" path="res://assets/tilesets/forest-tileset.png" id="1"]

[resource]
tile_size = Vector2i(16, 16)
```

The `.tres` file includes tile IDs, collision shapes (for tiles with `collision: true`), and tile type metadata.

### Tileset Metadata JSON

A JSON metadata file is also emitted for engine-agnostic use:

```json
{
  "id": "forest-tileset",
  "tileWidth": 16,
  "tileHeight": 16,
  "columns": 8,
  "tiles": [
    { "index": 0, "name": "grass", "variant": 0, "tileType": "floor", "collision": false },
    { "index": 1, "name": "grass", "variant": 1, "tileType": "floor", "collision": false },
    { "index": 2, "name": "grass", "variant": 2, "tileType": "floor", "collision": false },
    { "index": 3, "name": "dirt-path", "variant": 0, "tileType": "floor", "collision": false },
    { "index": 4, "name": "dirt-path", "variant": 1, "tileType": "floor", "collision": false },
    { "index": 5, "name": "tree-trunk", "variant": 0, "tileType": "wall", "collision": true },
    { "index": 6, "name": "tree-canopy", "variant": 0, "tileType": "decoration", "collision": false }
  ]
}
```

---

## Quality Validation

**Goal:** Automatically verify that processed assets meet their specifications.

Quality validation runs after all other post-processing steps and reports warnings or errors. It is also available standalone via `pixelforge validate`.

### Checks

| Check | What It Verifies | Severity |
|-------|-----------------|----------|
| **Dimensions** | Output image is exactly `targetWidth x targetHeight` | Error |
| **Palette compliance** | Every non-transparent pixel uses a color from the assigned palette | Error (strict) / Warning (soft) |
| **Transparency** | Background area is fully transparent with no stray opaque pixels | Warning |
| **Frame count** | Spritesheet contains the correct number of frames per animation | Error |
| **File integrity** | PNG is valid, not truncated, and readable | Error |
| **Visual coverage** | Subject occupies a reasonable portion of the frame (not too small, not clipped) | Warning |

### Strict vs. Soft Mode

In **strict mode** (`--strict` flag or `palette.enforcement: strict`), any palette deviation is an error. In **soft mode**, pixels within a configurable deltaE threshold of a palette color are accepted with a warning.

Validation results are displayed in the terminal and stored in the manifest for review in the review server.
