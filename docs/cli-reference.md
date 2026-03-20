# CLI Reference

Complete reference for all PixelForge commands and flags.

## Global Flags

These flags can be used with any command.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--definitions <path>` | string | `./definitions` | Path to the YAML definitions directory. |
| `--output <path>` | string | `./.pixelforge` | Working output directory (cache, raw, processed). |
| `--config <path>` | string | `./pixelforge.config.yaml` | Path to configuration file. |
| `--verbose` | boolean | `false` | Enable verbose logging. |
| `--quiet` | boolean | `false` | Suppress all output except errors. |
| `--help` | boolean | — | Show help for the command. |
| `--version` | boolean | — | Show PixelForge version. |

---

## Commands

### `pixelforge generate`

Generate assets by sending prompts to the image generation API and running the full post-processing pipeline.

```bash
pixelforge generate [flags]
```

#### Scope Flags

Scope flags control which assets are generated. They can be combined — multiple flags are AND-combined (all conditions must match).

| Flag | Type | Description |
|------|------|-------------|
| `--all` | boolean | Generate all assets defined in the definitions directory. |
| `--category <type>` | string | Filter by category: `sprite`, `enemy`, `character`, `tileset`, `ui`, `battle-background`, `portrait`, `icon`. |
| `--biome <id>` | string | Filter by biome ID (e.g., `forest`, `frost`, `volcano`). |
| `--class <name>` | string | Filter characters by class (e.g., `warrior`, `mage`). |
| `--family <id>` | string | Filter enemies by family (e.g., `wolf`, `dragon`, `golem`). |
| `--id <asset-id>` | string | Target a single asset by its ID. |
| `--animation <name>` | string | Target a specific animation within an asset. Requires `--id`. |
| `--type <type>` | string | Filter by UI type, icon type, or scene type. |
| `--tag <tag>` | string | Filter by tag. Can be specified multiple times. |

#### Behavior Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--force` | boolean | `false` | Bypass cache and regenerate even if cached output exists. |
| `--status <status>` | string | — | Only generate assets with this status: `pending`, `rejected`. |
| `--dry-run` | boolean | `false` | Show what would be generated and estimated cost without making API calls. |
| `--priority <n>` | number | — | Only generate assets with priority <= n. |
| `--cost-limit <amount>` | number | — | Maximum spend in USD for this session. Generation stops when the limit is reached. |
| `--provider <name>` | string | `openai` | Image generation provider. Currently only `openai` is supported. |
| `--concurrency <n>` | number | `3` | Maximum number of concurrent API calls. |

#### Examples

```bash
# Generate everything
pixelforge generate --all

# Generate all enemies
pixelforge generate --category enemy

# Generate frost biome enemies only
pixelforge generate --category enemy --biome frost

# Generate all wolf variants across biomes
pixelforge generate --family wolf

# Generate one specific asset
pixelforge generate --id frost-dragon

# Generate only the idle animation for frost-dragon
pixelforge generate --id frost-dragon --animation idle

# Regenerate rejected assets
pixelforge generate --all --status rejected

# Dry run to estimate costs
pixelforge generate --all --dry-run

# Force regenerate with a cost cap
pixelforge generate --category tileset --force --cost-limit 10.00

# Generate high-priority assets first, up to $5
pixelforge generate --all --priority 3 --cost-limit 5.00

# Generate assets tagged "boss"
pixelforge generate --tag boss
```

---

### `pixelforge process`

Re-run post-processing on existing raw images without making any API calls. Useful when you change a palette, resize target, or post-processing configuration.

```bash
pixelforge process [flags]
```

Accepts the same scope flags as `generate` (`--all`, `--category`, `--id`, etc.) to target which assets to reprocess.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--skip-background-removal` | boolean | `false` | Skip background removal step. |
| `--skip-palette` | boolean | `false` | Skip palette enforcement step. |
| `--skip-downscale` | boolean | `false` | Skip downscaling step. |
| `--skip-assembly` | boolean | `false` | Skip spritesheet/tileset assembly step. |

#### Examples

```bash
# Reprocess all assets (e.g., after palette change)
pixelforge process --all

# Reprocess only tilesets
pixelforge process --category tileset

# Reprocess one asset, skipping background removal
pixelforge process --id frost-dragon --skip-background-removal
```

---

### `pixelforge export`

Copy processed assets from the working directory to your game engine's asset directory.

```bash
pixelforge export [flags]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--target <path>` | string | Required | Target directory for exported assets. |
| `--format <fmt>` | string | `godot` | Export format: `godot`, `flat`, `custom`. |
| `--clean` | boolean | `false` | Remove existing files in target directory before export. |
| `--include-metadata` | boolean | `true` | Include JSON metadata files alongside images. |

Accepts scope flags to export a subset of assets.

#### Examples

```bash
# Export everything to your game's assets directory
pixelforge export --target ./my-game/assets

# Export only enemies as a flat directory
pixelforge export --target ./output --format flat --category enemy

# Clean export (remove old files first)
pixelforge export --target ./my-game/assets --clean
```

#### Export Formats

**`godot`** (default) — Organizes assets into Godot-compatible directories:

```
target/
├── sprites/
│   └── enemies/
│       ├── frost-dragon.png
│       └── frost-dragon.json
├── tilesets/
│   ├── forest-tileset.png
│   └── forest-tileset.tres
├── ui/
│   ├── dialog-frame.png
│   └── health-bar.png
└── backgrounds/
    └── frost-cave-battle-bg.png
```

**`flat`** — All assets in a single directory:

```
target/
├── frost-dragon.png
├── frost-dragon.json
├── forest-tileset.png
└── frost-cave-battle-bg.png
```

**`custom`** — Uses a template path defined in your config file.

---

### `pixelforge review`

Launch a local web server for visual QA of generated assets.

```bash
pixelforge review [flags]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--port <n>` | number | `3000` | Port for the review server. |
| `--host <addr>` | string | `localhost` | Host to bind to. |

#### Features

- View all generated assets at multiple zoom levels (1x, 2x, 4x, 8x)
- See raw vs. processed comparison (before and after post-processing)
- Approve or reject individual assets
- Trigger regeneration of rejected assets directly from the UI
- Filter by category, biome, status
- View spritesheet animations in real-time
- View palette analysis per asset

#### Example

```bash
# Launch review server
pixelforge review

# Launch on a custom port
pixelforge review --port 8080
```

---

### `pixelforge validate`

Run quality checks on processed assets without generating anything.

```bash
pixelforge validate [flags]
```

Accepts scope flags to validate a subset of assets.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--strict` | boolean | `false` | Fail on warnings (not just errors). |

#### Checks Performed

- **Dimensions** — Output matches `targetWidth` x `targetHeight`
- **Palette compliance** — All pixels use colors from the assigned palette
- **Transparency** — Background is fully transparent (no stray opaque pixels in expected-transparent areas)
- **Frame count** — Spritesheet has the correct number of frames per animation
- **File integrity** — PNG files are valid and not corrupted
- **Missing assets** — Definitions without corresponding generated output

#### Example

```bash
# Validate everything
pixelforge validate --all

# Strict validation on enemies
pixelforge validate --category enemy --strict
```

---

### `pixelforge status`

Show a summary of generation status across all defined assets.

```bash
pixelforge status [flags]
```

Accepts scope flags to filter the summary.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--format <fmt>` | string | `table` | Output format: `table`, `json`, `csv`. |

#### Example

```bash
$ pixelforge status --all

Category          Total  Pending  Generated  Approved  Rejected
─────────────────────────────────────────────────────────────────
enemy               24        2         12         8         2
character            6        0          2         4         0
tileset              4        1          1         2         0
ui                   8        0          3         5         0
battle-background    4        0          2         2         0
portrait             6        0          4         2         0
icon                12        4          3         5         0
─────────────────────────────────────────────────────────────────
Total               64        7         27        28         2
```

---

### `pixelforge cost`

Show cost tracking summary for API calls made by PixelForge.

```bash
pixelforge cost [flags]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--session` | boolean | `false` | Show costs for the current/last session only. |
| `--format <fmt>` | string | `table` | Output format: `table`, `json`. |
| `--reset` | boolean | `false` | Reset cost tracking history. |

#### Example

```bash
$ pixelforge cost

Provider  Model          Calls  Images  Est. Cost
──────────────────────────────────────────────────
openai    gpt-image-1      147     147     $5.88

Session history:
  2025-01-15  42 calls  $1.68
  2025-01-16  65 calls  $2.60
  2025-01-17  40 calls  $1.60

Total: $5.88
```

---

### `pixelforge manifest`

Auto-generate or update the manifest file from your YAML definitions. The manifest tracks which assets exist, their status, and cache state.

```bash
pixelforge manifest [flags]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--rebuild` | boolean | `false` | Rebuild the manifest from scratch (re-scan all definitions and outputs). |

#### Example

```bash
# Update manifest with any new/changed definitions
pixelforge manifest

# Full rebuild
pixelforge manifest --rebuild
```

---

## Configuration File

PixelForge can be configured via a `pixelforge.config.yaml` file in your project root.

```yaml
# pixelforge.config.yaml

# Default paths
definitions: ./definitions
output: ./.pixelforge
export:
  target: ./assets
  format: godot

# API configuration
provider: openai
model: gpt-image-1
concurrency: 3

# Post-processing defaults
postProcessing:
  backgroundRemoval:
    enabled: true
    keyColor: "#FF00FF"
  downscale:
    method: nearest-neighbor
  palette:
    enforcement: strict     # strict = clamp all pixels, soft = allow close matches
    maxColors: 16
    distanceMetric: cie76   # cie76, cie94, or ciede2000

# Cost control
costLimit: 20.00            # Per-session default

# Review server
review:
  port: 3000
  host: localhost
```

All config values can be overridden by CLI flags. CLI flags take precedence over the config file, which takes precedence over defaults.
