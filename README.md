# PixelForge

**AI-powered pixel art pipeline for retro games**

PixelForge is an open-source Node.js/TypeScript CLI tool that generates sprites, tilesets, battle backgrounds, and UI assets from YAML definitions using OpenAI's gpt-image-1 model. It enforces retro authenticity through strict palette constraints, nearest-neighbor scaling, and automated spritesheet assembly. Every generation is cached by prompt hash (SHA-256), so re-runs cost nothing — you only pay for changes.

## Features

- **YAML-driven asset definitions** — Define once, generate everything
- **OpenAI gpt-image-1 integration** — More providers planned
- **Strict palette enforcement** — Configurable N-color palettes using CIE76 perceptual color distance
- **Nearest-neighbor downscaling** — 1024x1024 raw output to any target size, keeping pixels crisp
- **Automatic spritesheet assembly** — Grid layout with metadata JSON
- **Tileset assembly** — Grid packing with Godot TileSet compatibility
- **Background removal** — Configurable key color (default magenta `#FF00FF`)
- **SHA-256 prompt-hash caching** — Re-runs are free; only changes trigger API calls
- **Selective generation** — From `--all` down to a single animation frame, with biome/family/category filters
- **Cost tracking** — `--cost-limit` per session to stay within budget
- **Review server** — Local web UI for approve/reject/regenerate workflows
- **Manual override support** — Hand-edited assets take precedence over generated ones
- **Dry-run mode** — Preview what would generate without making API calls

## Quick Start

```bash
npm install pixelforge
# or clone and use directly
git clone https://github.com/rondorkerin/pixelforge
cd pixelforge && npm install
```

```bash
# Set your API key
export OPENAI_API_KEY=sk-...

# Generate from your project's asset definitions
npx pixelforge generate --all --definitions ./my-game/assets/definitions

# Or target specific assets
npx pixelforge generate --id enemy-frost-dragon
npx pixelforge generate --category tilesets --biome forest

# Review generated assets
npx pixelforge review

# Export to your game engine
npx pixelforge export --target ./my-game/assets
```

## How It Works

```
YAML Definitions → Prompt Engineering → OpenAI API → Post-Processing → Export
                                                       ├─ Background removal
                                                       ├─ Nearest-neighbor downscale
                                                       ├─ Palette enforcement
                                                       └─ Spritesheet assembly
```

1. **Define** your assets in YAML — sprites, enemies, tilesets, UI elements, anything.
2. **Generate** sends engineered prompts to OpenAI's image API, respecting your definitions.
3. **Post-process** enforces retro constraints: palette clamping, pixel-perfect downscaling, background removal.
4. **Assemble** frames into spritesheets and tiles into tilesets, emitting metadata JSON.
5. **Export** copies processed assets into your game engine's directory structure.

Every step is cached. Change a prompt? Only that asset regenerates. Change a palette? Only post-processing reruns. Change nothing? Zero API calls.

## YAML Definition Example

```yaml
id: frost-dragon
category: enemy
name: Frost Dragon
targetWidth: 32
targetHeight: 32
palette: ice-palette
promptHints: "a fearsome ice dragon with crystalline scales and frost breath"
visualTraits:
  - "serpentine dragon body"
  - "ice crystal wings"
  - "glowing blue eyes"
  - "frost particles around body"
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

See the [YAML Schema Reference](docs/yaml-schema.md) for all supported fields and asset types.

## Selective Generation

Target exactly what you need with the scope hierarchy:

```
--all                              # Everything
--category enemies                 # All enemies
--category enemies --biome frost   # All frost enemies
--family dragon                    # All dragon variants
--id enemy-frost-dragon            # One specific asset
--id enemy-frost-dragon --animation idle  # One animation
```

Combine with `--dry-run` to preview costs before committing, or `--cost-limit 5.00` to cap spending per session.

See the [Selective Generation Guide](docs/selective-generation.md) for workflows and examples.

## Documentation

- [Getting Started](docs/getting-started.md) — Installation, setup, your first asset
- [YAML Schema Reference](docs/yaml-schema.md) — Complete definition format for all asset types
- [CLI Reference](docs/cli-reference.md) — All commands and flags
- [Post-Processing](docs/post-processing.md) — Background removal, palette enforcement, spritesheet assembly
- [Caching](docs/caching.md) — How prompt-hash caching works
- [Selective Generation](docs/selective-generation.md) — Targeting, filtering, and cost control

## Used By

- **[The Farthest Dawn](https://github.com/rondorkerin/the-farthest-dawn)** — A retro RPG built with Godot, where PixelForge was originally developed

Using PixelForge in your project? Open a PR to add it here.

## Contributing

Contributions are welcome! Here's how to get involved:

- **Bug reports** — Open an issue with reproduction steps and expected vs. actual behavior
- **Feature requests** — Open an issue describing the use case and proposed solution
- **Pull requests** — Fork the repo, create a feature branch, and submit a PR against `main`

Please keep PRs focused on a single change. If you're planning something large, open an issue first to discuss the approach.

## License

MIT
