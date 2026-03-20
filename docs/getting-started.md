# Getting Started

This guide walks you through installing PixelForge, setting up your API key, creating your first asset definition, and generating pixel art.

## Prerequisites

- **Node.js 20+** — [Download](https://nodejs.org/)
- **npm** (included with Node.js)
- **OpenAI API key** — You need access to the `gpt-image-1` model. [Get an API key](https://platform.openai.com/api-keys)

## Installation

### Option A: Install from npm

```bash
npm install -g pixelforge
```

### Option B: Clone the repository

```bash
git clone https://github.com/rondorkerin/pixelforge
cd pixelforge
npm install
npm run build
```

When running from a clone, prefix commands with `npx` or use `npm run` scripts:

```bash
npx pixelforge generate --all
```

## API Key Setup

PixelForge needs an OpenAI API key to generate images. You can provide it in two ways:

### Environment variable

```bash
export OPENAI_API_KEY=sk-...
```

### .env file

Create a `.env` file in your project root:

```
OPENAI_API_KEY=sk-...
```

PixelForge will automatically load `.env` if present. Make sure `.env` is in your `.gitignore`.

## Create Your First Asset Definition

Create a directory for your asset definitions:

```bash
mkdir -p my-game/definitions
```

### 1. Define a palette

Create `my-game/definitions/palettes.yaml`:

```yaml
palettes:
  - id: forest-palette
    name: Forest
    colors:
      - "#1a1c2c"
      - "#2b3a1e"
      - "#3e5c2a"
      - "#5a8c3c"
      - "#7bb551"
      - "#a8d97a"
      - "#d4f0a0"
      - "#f4f4e8"
      - "#5b3c1e"
      - "#8b5e34"
      - "#c49a6c"
      - "#3a5c8a"
      - "#5a8ab4"
      - "#e06060"
      - "#f0a040"
      - "#f8e870"
    description: "Earthy greens, browns, and natural accents for forest environments"
```

### 2. Define an asset

Create `my-game/definitions/enemies/forest-wolf.yaml`:

```yaml
id: forest-wolf
category: enemy
name: Forest Wolf
targetWidth: 32
targetHeight: 32
palette: forest-palette
promptHints: "a fierce timber wolf prowling through dense forest"
visualTraits:
  - "grey-brown fur"
  - "glowing amber eyes"
  - "muscular build"
  - "bared fangs"
animations:
  - name: idle
    frameCount: 2
  - name: attack
    frameCount: 3
  - name: hurt
    frameCount: 1
  - name: death
    frameCount: 3
```

### 3. Generate it

```bash
npx pixelforge generate --id forest-wolf --definitions ./my-game/definitions
```

PixelForge will:
1. Read the YAML definition
2. Engineer a prompt for each animation frame
3. Call the OpenAI API to generate 1024x1024 images
4. Remove the background
5. Downscale to 32x32 using nearest-neighbor interpolation
6. Clamp all colors to the 16-color forest palette
7. Assemble frames into a spritesheet
8. Write everything to the output directory

### 4. Preview the cost first (optional)

Not sure what it will cost? Use dry-run mode:

```bash
npx pixelforge generate --id forest-wolf --definitions ./my-game/definitions --dry-run
```

This shows you exactly what would be generated and the estimated API cost, without making any calls.

### 5. Review it

Launch the review server to inspect the generated asset:

```bash
npx pixelforge review
```

This opens a local web UI where you can:
- View each frame at multiple zoom levels
- Approve or reject individual assets
- Trigger regeneration of rejected assets
- Compare before/after post-processing

### 6. Export it

Copy the processed assets to your game's asset directory:

```bash
npx pixelforge export --target ./my-game/assets
```

## Project Structure

Here is how PixelForge itself is organized:

```
pixelforge/
├── src/
│   ├── cli/              # CLI entry point and command definitions
│   ├── generate/         # Prompt engineering and API integration
│   ├── process/          # Post-processing pipeline
│   │   ├── background-removal.ts
│   │   ├── downscale.ts
│   │   ├── palette-enforce.ts
│   │   └── spritesheet.ts
│   ├── cache/            # SHA-256 prompt-hash caching
│   ├── review/           # Review server (Express + static UI)
│   ├── export/           # Engine-specific exporters
│   ├── validate/         # Quality validation checks
│   └── types/            # TypeScript type definitions
├── docs/                 # Documentation (you are here)
├── examples/             # Example YAML definitions
├── package.json
├── tsconfig.json
└── README.md
```

### Your project structure

When using PixelForge in your game project, a typical layout looks like:

```
my-game/
├── definitions/          # YAML asset definitions (input)
│   ├── palettes.yaml
│   ├── enemies/
│   │   ├── forest-wolf.yaml
│   │   └── fire-golem.yaml
│   ├── tilesets/
│   │   └── forest-tiles.yaml
│   └── ui/
│       └── health-bar.yaml
├── .pixelforge/          # PixelForge working directory (auto-created)
│   ├── cache/            # Prompt-hash cache
│   ├── raw/              # Raw API output (1024x1024)
│   ├── processed/        # Post-processed assets
│   └── manifest.json     # Generation manifest
├── assets/               # Exported game-ready assets (output)
│   ├── sprites/
│   ├── tilesets/
│   └── ui/
└── .env                  # API key (do not commit)
```

## Next Steps

- [YAML Schema Reference](yaml-schema.md) — Learn all the fields you can use in definitions
- [CLI Reference](cli-reference.md) — See every command and flag
- [Post-Processing](post-processing.md) — Understand how raw images become pixel-perfect sprites
- [Selective Generation](selective-generation.md) — Target exactly what you need
