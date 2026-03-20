# YAML Schema Reference

This is the complete reference for all YAML definition formats supported by PixelForge. Assets are defined in YAML files organized by type, and PixelForge reads these definitions to generate, post-process, and assemble your pixel art.

## Table of Contents

- [Asset Definition (Base Schema)](#asset-definition-base-schema)
- [Category Types](#category-types)
- [Animation Spec](#animation-spec)
- [Palette Definition](#palette-definition)
- [Biome Definition](#biome-definition)
- [Enemy Definition](#enemy-definition)
- [Enemy Family Definition](#enemy-family-definition)
- [Character Definition](#character-definition)
- [Tileset Definition](#tileset-definition)
- [UI Element Definition](#ui-element-definition)
- [Battle Background Definition](#battle-background-definition)
- [Portrait Definition](#portrait-definition)
- [Icon Definition](#icon-definition)

---

## Asset Definition (Base Schema)

Every asset definition shares these base fields. Category-specific fields are documented in their own sections below.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for this asset. Used in filenames, caching, and CLI targeting. |
| `category` | string | Yes | Asset type. See [Category Types](#category-types). |
| `name` | string | Yes | Human-readable display name. |
| `targetWidth` | number | Yes | Final output width in pixels. |
| `targetHeight` | number | Yes | Final output height in pixels. |
| `palette` | string | Yes | Reference to a palette `id` defined in your palettes file. |
| `promptHints` | string | Yes | Core description sent to the image generation model. Be specific about the subject, style, and composition. |
| `visualTraits` | string[] | No | List of visual details appended to the prompt. Each trait adds specificity. |
| `animations` | Animation[] | No | Animation definitions. Omit for static assets (single frame). |
| `generationStrategy` | string | No | How frames are generated. `"individual"` (default) generates each frame separately. `"strip"` generates all frames in one image. |
| `priority` | number | No | Generation priority (1 = highest). Higher priority assets generate first. Default: `5`. |
| `status` | string | No | Current lifecycle status. Managed by PixelForge. One of: `pending`, `generated`, `approved`, `rejected`. |
| `biome` | string | No | Biome association for filtering. References a biome `id`. |
| `family` | string | No | Family grouping for filtering (e.g., "dragon", "elemental"). |
| `tags` | string[] | No | Arbitrary tags for custom filtering. |
| `manualOverride` | boolean | No | If `true`, PixelForge will not regenerate this asset. Use when you have hand-edited the output. Default: `false`. |

### Minimal Example

```yaml
id: treasure-chest
category: sprite
name: Treasure Chest
targetWidth: 16
targetHeight: 16
palette: dungeon-palette
promptHints: "a small wooden treasure chest with gold trim, closed"
```

### Full Example

```yaml
id: frost-dragon
category: enemy
name: Frost Dragon
targetWidth: 32
targetHeight: 32
palette: ice-palette
biome: frost
family: dragon
priority: 2
promptHints: "a fearsome ice dragon with crystalline scales and frost breath"
visualTraits:
  - "serpentine dragon body"
  - "ice crystal wings"
  - "glowing blue eyes"
  - "frost particles around body"
generationStrategy: individual
tags:
  - "boss"
  - "flying"
animations:
  - name: idle
    frameCount: 2
  - name: attack
    frameCount: 3
  - name: hurt
    frameCount: 1
  - name: death
    frameCount: 4
```

---

## Category Types

The `category` field determines how PixelForge processes and exports the asset.

| Category | Description | Typical Size | Animations |
|----------|-------------|-------------|------------|
| `sprite` | Generic sprite (items, projectiles, effects) | 16x16 - 32x32 | Optional |
| `enemy` | Enemy characters | 32x32 - 64x64 | Yes (idle, attack, hurt, death) |
| `character` | Player or NPC characters | 32x32 - 64x64 | Yes (idle, walk, attack, etc.) |
| `tileset` | Environment tiles assembled into a tileset | 16x16 per tile | No |
| `ui` | User interface elements (buttons, frames, bars) | Varies | Optional |
| `battle-background` | Full battle scene backgrounds | 256x128 - 320x180 | Optional |
| `portrait` | Character face portraits | 48x48 - 96x96 | No |
| `icon` | Small icons (inventory, status, abilities) | 16x16 | No |

---

## Animation Spec

Animations define how multi-frame assets are generated and assembled into spritesheets.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Animation name (e.g., `idle`, `attack`, `walk`). Used in spritesheet metadata. |
| `frameCount` | number | Yes | Number of frames in this animation. |
| `frameWidth` | number | No | Override width per frame. Defaults to the asset's `targetWidth`. |
| `frameHeight` | number | No | Override height per frame. Defaults to the asset's `targetHeight`. |
| `fps` | number | No | Playback speed in frames per second. Default: `8`. Written to spritesheet metadata. |
| `loop` | boolean | No | Whether the animation loops. Default: `true`. Written to spritesheet metadata. |

### Example

```yaml
animations:
  - name: idle
    frameCount: 2
    fps: 4
    loop: true
  - name: walk
    frameCount: 4
    fps: 8
    loop: true
  - name: attack
    frameCount: 3
    fps: 10
    loop: false
  - name: hurt
    frameCount: 1
  - name: death
    frameCount: 4
    fps: 6
    loop: false
```

### Spritesheet Output

Animations are assembled into a single spritesheet image with an accompanying metadata JSON file:

```
frost-dragon.png          # Spritesheet (all frames in a grid)
frost-dragon.json         # Metadata (frame positions, animation names, fps)
```

The metadata JSON format:

```json
{
  "id": "frost-dragon",
  "frameWidth": 32,
  "frameHeight": 32,
  "animations": {
    "idle": { "startFrame": 0, "frameCount": 2, "fps": 4, "loop": true },
    "attack": { "startFrame": 2, "frameCount": 3, "fps": 10, "loop": false },
    "hurt": { "startFrame": 5, "frameCount": 1, "fps": 8, "loop": true },
    "death": { "startFrame": 6, "frameCount": 4, "fps": 6, "loop": false }
  },
  "totalFrames": 10,
  "columns": 5,
  "rows": 2
}
```

---

## Palette Definition

Palettes define the exact colors available for an asset. Post-processing clamps every pixel to the nearest color in the palette using CIE76 perceptual distance.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier referenced by asset definitions. |
| `name` | string | Yes | Human-readable name. |
| `colors` | string[] | Yes | Array of hex color strings. Typically 4-16 colors. |
| `description` | string | No | What this palette is for. |
| `transparentColor` | string | No | Hex color treated as transparent. Default: `"#FF00FF"` (magenta). |

### Example

```yaml
palettes:
  - id: ice-palette
    name: Ice
    colors:
      - "#0d1b2a"
      - "#1b2a4a"
      - "#2a4a6a"
      - "#3a6a8a"
      - "#4a8aaa"
      - "#6aAAcc"
      - "#8accee"
      - "#c0e8ff"
      - "#e8f4ff"
      - "#ffffff"
      - "#4a3060"
      - "#6a4080"
      - "#8a60a0"
      - "#404860"
      - "#607080"
      - "#90a0b0"
    description: "Cool blues, whites, and purple accents for ice/frost environments"

  - id: fire-palette
    name: Fire
    colors:
      - "#1a0a00"
      - "#3a1000"
      - "#6a2010"
      - "#8a3020"
      - "#aa4030"
      - "#cc5040"
      - "#ee7050"
      - "#ff9060"
      - "#ffb080"
      - "#ffd0a0"
      - "#ffe8c0"
      - "#fff8e0"
      - "#604020"
      - "#806040"
      - "#a08060"
      - "#c0a080"
    description: "Warm reds, oranges, and browns for fire/volcanic environments"
```

---

## Biome Definition

Biomes group related assets and provide shared context for generation. Useful for environment-themed games.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique biome identifier. |
| `name` | string | Yes | Human-readable name. |
| `prefix` | string | No | Prefix added to asset IDs in this biome (e.g., `"frost"` makes `"frost-wolf"`). |
| `palette` | string | Yes | Default palette for assets in this biome. |
| `description` | string | No | Environment description appended to all prompts in this biome. |
| `tiles` | TileDef[] | No | Tile definitions for this biome's tileset. See [Tileset Definition](#tileset-definition). |
| `enemyOverrides` | object | No | Per-family overrides for enemies in this biome. See [Enemy Family Definition](#enemy-family-definition). |
| `ambientTraits` | string[] | No | Visual traits appended to all assets in this biome. |

### Example

```yaml
biomes:
  - id: frost
    name: Frozen Peaks
    prefix: frost
    palette: ice-palette
    description: "a frozen mountain landscape with ice caves and snow-covered peaks"
    ambientTraits:
      - "frost and ice particles in the air"
      - "cool blue lighting"
      - "snow-covered surfaces"
    tiles:
      - name: ground
        promptHints: "frozen ground with patches of ice and snow"
      - name: wall
        promptHints: "ice cave wall with crystalline formations"
      - name: water
        promptHints: "partially frozen water with thin ice sheets"
      - name: decoration
        promptHints: "icicle formation hanging from above"
    enemyOverrides:
      wolf:
        promptHints: "an arctic wolf with white fur and ice-blue eyes"
        visualTraits:
          - "thick white fur coat"
          - "breath visible in cold air"
      golem:
        promptHints: "a golem made of packed ice and glacial stone"
        visualTraits:
          - "translucent ice body"
          - "frozen core glowing blue"
```

---

## Enemy Definition

Enemy definitions extend the base schema with combat-oriented fields.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `family` | string | No | Enemy family for grouping variants (e.g., `"wolf"`, `"dragon"`, `"golem"`). |
| `biome` | string | No | Biome this enemy belongs to. |
| `variant` | string | No | Variant label within a family (e.g., `"frost"`, `"fire"`, `"shadow"`). |
| `size` | string | No | Size class: `"small"`, `"medium"`, `"large"`, `"boss"`. Affects default dimensions. |

### Example

```yaml
id: fire-golem
category: enemy
name: Fire Golem
targetWidth: 48
targetHeight: 48
palette: fire-palette
biome: volcano
family: golem
variant: fire
size: large
promptHints: "a massive golem made of molten rock and flowing lava"
visualTraits:
  - "body of cracked obsidian with lava seeping through"
  - "glowing orange eyes"
  - "magma dripping from fists"
  - "smoke and embers rising from shoulders"
animations:
  - name: idle
    frameCount: 2
  - name: attack
    frameCount: 4
  - name: hurt
    frameCount: 1
  - name: death
    frameCount: 5
```

---

## Enemy Family Definition

Enemy families let you define a base template and generate biome variants automatically. This avoids duplicating definitions across biomes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `familyId` | string | Yes | Unique family identifier. |
| `name` | string | Yes | Family display name. |
| `basePromptHints` | string | Yes | Base prompt shared across all variants. |
| `baseVisualTraits` | string[] | No | Visual traits shared across all variants. |
| `baseAnimations` | Animation[] | Yes | Animation set shared across all variants. |
| `targetWidth` | number | Yes | Default width for all variants. |
| `targetHeight` | number | Yes | Default height for all variants. |
| `variants` | object | No | Per-biome overrides. Keys are biome IDs. |

### Example

```yaml
enemyFamilies:
  - familyId: wolf
    name: Wolf
    targetWidth: 32
    targetHeight: 32
    basePromptHints: "a fierce wolf in an aggressive stance"
    baseVisualTraits:
      - "muscular canine body"
      - "bared fangs"
      - "alert ears"
    baseAnimations:
      - name: idle
        frameCount: 2
      - name: attack
        frameCount: 3
      - name: hurt
        frameCount: 1
      - name: death
        frameCount: 3
    variants:
      forest:
        promptHints: "a timber wolf with grey-brown fur prowling through dense woods"
        visualTraits:
          - "grey-brown fur"
          - "leaf debris on coat"
      frost:
        promptHints: "an arctic wolf with white fur and piercing blue eyes"
        visualTraits:
          - "thick white fur"
          - "frost on muzzle"
      shadow:
        promptHints: "a spectral wolf made of dark smoke and purple energy"
        visualTraits:
          - "translucent dark body"
          - "glowing purple eyes"
          - "shadow particles trailing behind"
```

When PixelForge processes this family, it generates one enemy per variant, merging the base fields with variant overrides. The resulting IDs follow the pattern `{biome}-{familyId}` (e.g., `forest-wolf`, `frost-wolf`, `shadow-wolf`).

---

## Character Definition

Character definitions extend the base schema with fields for player characters and NPCs.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `class` | string | No | Character class (e.g., `"warrior"`, `"mage"`, `"ranger"`). Used for `--class` filtering. |
| `role` | string | No | Narrative role: `"player"`, `"npc"`, `"companion"`. |
| `facing` | string | No | Sprite facing direction: `"front"`, `"side"`, `"both"`. Default: `"side"`. |

### Example

```yaml
id: fire-mage
category: character
name: Fire Mage
class: mage
role: player
targetWidth: 32
targetHeight: 32
palette: fire-palette
facing: side
promptHints: "a hooded mage wielding flame magic, robes billowing"
visualTraits:
  - "flowing red and orange robes"
  - "staff with a flame crystal"
  - "glowing hands"
  - "hood partially covering face"
animations:
  - name: idle
    frameCount: 2
  - name: walk
    frameCount: 4
    fps: 8
  - name: attack
    frameCount: 4
    fps: 10
  - name: cast
    frameCount: 3
    fps: 8
  - name: hurt
    frameCount: 1
  - name: death
    frameCount: 4
    fps: 6
```

---

## Tileset Definition

Tilesets are collections of individual tiles assembled into a single tileset image. Each tile is generated separately, then packed into a grid.

### Tileset Container

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Tileset identifier. |
| `category` | string | Yes | Must be `"tileset"`. |
| `name` | string | Yes | Human-readable name. |
| `tileWidth` | number | Yes | Width of each tile in pixels. |
| `tileHeight` | number | Yes | Height of each tile in pixels. |
| `palette` | string | Yes | Palette reference. |
| `biome` | string | No | Biome association. |
| `columns` | number | No | Number of columns in the assembled tileset. Default: auto-calculated. |
| `godotCompatible` | boolean | No | Export Godot `.tres` TileSet resource alongside the image. Default: `true`. |
| `tiles` | TileDef[] | Yes | Array of tile definitions. |

### Tile Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Tile name (e.g., `"ground"`, `"wall-top"`, `"water"`). |
| `promptHints` | string | Yes | Description of this specific tile. |
| `visualTraits` | string[] | No | Additional visual details for this tile. |
| `variants` | number | No | Number of visual variants to generate for this tile. Default: `1`. |
| `collision` | boolean | No | Whether this tile has collision. Written to metadata. Default: `false`. |
| `tileType` | string | No | Semantic type: `"floor"`, `"wall"`, `"water"`, `"decoration"`, `"transition"`. |

### Example

```yaml
id: forest-tileset
category: tileset
name: Forest Tileset
tileWidth: 16
tileHeight: 16
palette: forest-palette
biome: forest
columns: 8
godotCompatible: true
tiles:
  - name: grass
    promptHints: "lush green grass ground tile"
    tileType: floor
    variants: 3
  - name: dirt-path
    promptHints: "worn dirt path tile"
    tileType: floor
    variants: 2
  - name: tree-trunk
    promptHints: "thick tree trunk base"
    tileType: wall
    collision: true
  - name: tree-canopy
    promptHints: "dense leaf canopy from above"
    tileType: decoration
  - name: water
    promptHints: "clear forest stream water"
    tileType: water
    variants: 2
  - name: stone-wall
    promptHints: "mossy stone wall covered in vines"
    tileType: wall
    collision: true
  - name: flowers
    promptHints: "small wildflowers on grass"
    tileType: decoration
    variants: 2
  - name: bush
    promptHints: "small leafy bush"
    tileType: decoration
    collision: true
```

---

## UI Element Definition

UI elements cover buttons, frames, health bars, menus, and other interface components.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uiType` | string | No | UI element type: `"button"`, `"frame"`, `"bar"`, `"panel"`, `"cursor"`, `"icon-frame"`. |
| `states` | string[] | No | Visual states to generate (e.g., `["normal", "hover", "pressed", "disabled"]`). |
| `nineSlice` | object | No | Nine-slice configuration for scalable UI elements. |
| `nineSlice.top` | number | No | Top border in pixels. |
| `nineSlice.bottom` | number | No | Bottom border in pixels. |
| `nineSlice.left` | number | No | Left border in pixels. |
| `nineSlice.right` | number | No | Right border in pixels. |

### Example

```yaml
id: dialog-frame
category: ui
name: Dialog Frame
uiType: frame
targetWidth: 64
targetHeight: 48
palette: ui-palette
promptHints: "a medieval-style dialog box frame with ornate corners and a dark interior"
visualTraits:
  - "stone or metal border"
  - "decorative corner flourishes"
  - "dark semi-transparent interior"
nineSlice:
  top: 8
  bottom: 8
  left: 8
  right: 8

---

id: health-bar
category: ui
name: Health Bar
uiType: bar
targetWidth: 48
targetHeight: 8
palette: ui-palette
promptHints: "a pixel art health bar, red fill with dark border"
states:
  - full
  - three-quarter
  - half
  - quarter
  - empty

---

id: action-button
category: ui
name: Action Button
uiType: button
targetWidth: 32
targetHeight: 16
palette: ui-palette
promptHints: "a small medieval-style button with beveled edges"
states:
  - normal
  - hover
  - pressed
  - disabled
```

Multiple definitions can be placed in one file using YAML document separators (`---`).

---

## Battle Background Definition

Battle backgrounds are larger scene images used as backdrops during combat or other gameplay moments.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sceneType` | string | No | Scene composition hint: `"landscape"`, `"interior"`, `"arena"`, `"abstract"`. |
| `layers` | string[] | No | Parallax layer names if generating multi-layer backgrounds. |

### Example

```yaml
id: frost-cave-battle-bg
category: battle-background
name: Frost Cave Battle Background
targetWidth: 256
targetHeight: 128
palette: ice-palette
biome: frost
sceneType: interior
promptHints: "interior of a vast ice cave with stalactites, frozen floor, and blue ambient light"
visualTraits:
  - "massive icicle stalactites hanging from ceiling"
  - "frozen reflective floor"
  - "blue-white ambient glow from ice"
  - "dark cave receding into background"
  - "clear foreground area for battle"

---

id: volcanic-arena-battle-bg
category: battle-background
name: Volcanic Arena Battle Background
targetWidth: 256
targetHeight: 128
palette: fire-palette
biome: volcano
sceneType: arena
promptHints: "a volcanic arena surrounded by lava flows and jagged obsidian rocks"
visualTraits:
  - "rivers of flowing lava in background"
  - "jagged obsidian rock formations"
  - "orange-red glow from below"
  - "volcanic ash particles in the air"
  - "flat stone arena floor in center"
```

---

## Portrait Definition

Portraits are character face/bust images used in dialog, menus, or character select screens.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `expression` | string | No | Default expression: `"neutral"`, `"happy"`, `"angry"`, `"sad"`, `"surprised"`. |
| `expressions` | string[] | No | Generate multiple expressions as separate frames. |
| `bust` | boolean | No | If `true`, include shoulders/upper body. If `false`, face only. Default: `true`. |

### Example

```yaml
id: fire-mage-portrait
category: portrait
name: Fire Mage Portrait
targetWidth: 64
targetHeight: 64
palette: fire-palette
bust: true
promptHints: "portrait of a hooded fire mage with glowing eyes, dramatic lighting"
visualTraits:
  - "mysterious hooded figure"
  - "glowing orange eyes under hood"
  - "flame reflected on face"
  - "ornate collar on robes"
expressions:
  - neutral
  - angry
  - surprised
```

---

## Icon Definition

Icons are small images used for inventory items, status effects, abilities, and other compact UI representations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `iconType` | string | No | Icon category: `"item"`, `"ability"`, `"status"`, `"resource"`, `"quest"`. |

### Example

```yaml
id: icon-fire-sword
category: icon
name: Fire Sword Icon
iconType: item
targetWidth: 16
targetHeight: 16
palette: ui-palette
promptHints: "a flaming sword icon, blade engulfed in fire"
visualTraits:
  - "steel blade with orange flames"
  - "simple cross-guard"
  - "angled 45 degrees"

---

id: icon-poison-status
category: icon
name: Poison Status Icon
iconType: status
targetWidth: 16
targetHeight: 16
palette: ui-palette
promptHints: "a green poison droplet icon indicating poisoned status"
visualTraits:
  - "bright green droplet"
  - "small skull or crossbones"
  - "dripping effect"

---

id: icon-fireball-ability
category: icon
name: Fireball Ability Icon
iconType: ability
targetWidth: 16
targetHeight: 16
palette: fire-palette
promptHints: "a fireball spell icon, swirling ball of flame"
visualTraits:
  - "orange and red swirling flames"
  - "bright yellow core"
  - "trailing sparks"
```

---

## File Organization

You can organize your YAML definitions however you like. PixelForge recursively scans the definitions directory for all `.yaml` and `.yml` files.

### Recommended structure

```
definitions/
├── palettes.yaml           # All palette definitions
├── biomes.yaml             # All biome definitions
├── families.yaml           # Enemy family templates
├── enemies/
│   ├── forest-enemies.yaml # All enemies for one biome
│   ├── frost-enemies.yaml
│   └── volcano-enemies.yaml
├── characters/
│   ├── player-classes.yaml
│   └── npcs.yaml
├── tilesets/
│   ├── forest-tileset.yaml
│   └── frost-tileset.yaml
├── ui/
│   ├── frames.yaml
│   ├── bars.yaml
│   └── buttons.yaml
├── backgrounds/
│   └── battle-backgrounds.yaml
├── portraits/
│   └── character-portraits.yaml
└── icons/
    ├── items.yaml
    ├── abilities.yaml
    └── status-effects.yaml
```

### Multiple documents per file

Use YAML document separators (`---`) to define multiple assets in a single file:

```yaml
id: forest-wolf
category: enemy
name: Forest Wolf
# ... fields ...

---

id: forest-bear
category: enemy
name: Forest Bear
# ... fields ...

---

id: forest-spider
category: enemy
name: Forest Spider
# ... fields ...
```
