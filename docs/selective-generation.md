# Selective Generation

PixelForge lets you target exactly the assets you want to generate, from everything down to a single animation frame. This is essential for cost control and iterative workflows — you should never have to regenerate the entire project just because you changed one prompt.

## Scope Hierarchy

Scope flags form a hierarchy from broadest to most specific:

```
--all                                          # Everything in your definitions
  └─ --category <type>                         # One asset category
      └─ --biome <id>                          # Filter by biome
          └─ --family <id>                     # Filter by enemy family
              └─ --id <asset-id>               # One specific asset
                  └─ --animation <name>        # One animation within that asset
```

Each level narrows the scope. You can enter at any level.

## All Filtering Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--all` | Generate everything | `--all` |
| `--category <type>` | Filter by category | `--category enemy` |
| `--biome <id>` | Filter by biome | `--biome frost` |
| `--class <name>` | Filter characters by class | `--class mage` |
| `--family <id>` | Filter enemies by family | `--family dragon` |
| `--id <asset-id>` | Target one asset | `--id frost-dragon` |
| `--animation <name>` | Target one animation (requires `--id`) | `--id frost-dragon --animation idle` |
| `--type <type>` | Filter by subtype (UI type, icon type, scene type) | `--type button` |
| `--tag <tag>` | Filter by tag | `--tag boss` |
| `--status <status>` | Filter by lifecycle status | `--status rejected` |
| `--priority <n>` | Only assets with priority <= n | `--priority 2` |

## AND-Combination of Flags

Multiple flags are AND-combined. An asset must match **all** specified conditions:

```bash
# Enemies AND frost biome AND dragon family
pixelforge generate --category enemy --biome frost --family dragon
# → Generates: frost-dragon (and any other frost dragon variants)
# → Skips: frost-wolf, fire-dragon, forest-bear

# All enemies that are tagged "boss"
pixelforge generate --category enemy --tag boss

# All rejected UI elements
pixelforge generate --category ui --status rejected
```

## Examples By Scope Level

### Generate everything

```bash
pixelforge generate --all
```

Use for initial generation or when you want a complete refresh (combined with `--force`).

### Generate one category

```bash
pixelforge generate --category enemy
pixelforge generate --category tileset
pixelforge generate --category ui
pixelforge generate --category battle-background
pixelforge generate --category portrait
pixelforge generate --category icon
```

### Filter within a category

```bash
# All enemies in the frost biome
pixelforge generate --category enemy --biome frost

# All tilesets for the forest biome
pixelforge generate --category tileset --biome forest

# All mage characters
pixelforge generate --category character --class mage

# All button UI elements
pixelforge generate --category ui --type button
```

### Target a family across biomes

```bash
# All wolf variants (forest-wolf, frost-wolf, shadow-wolf, etc.)
pixelforge generate --family wolf

# All dragon variants
pixelforge generate --family dragon
```

### Target a single asset

```bash
pixelforge generate --id frost-dragon
```

### Target a single animation

```bash
pixelforge generate --id frost-dragon --animation idle
# Generates only the idle frames for frost-dragon
```

---

## Common Workflows

### First Run

Generate everything for the first time. Use `--dry-run` first to estimate costs:

```bash
# Preview what will be generated and estimated cost
pixelforge generate --all --dry-run

# Generate everything
pixelforge generate --all

# Review results
pixelforge review
```

### Add a New Asset Type

You added a new enemy definition. Only generate that one:

```bash
pixelforge generate --id flame-serpent
```

### Iterate on Prompts

You tweaked the `promptHints` for a few enemies. Cache will detect the changes automatically:

```bash
# Only changed assets will regenerate (cache miss on new prompt hash)
pixelforge generate --category enemy

# Or be specific
pixelforge generate --id frost-dragon
```

### Regenerate Rejected Assets

After reviewing assets in the review server and rejecting some:

```bash
# Regenerate only rejected assets
pixelforge generate --all --status rejected --force

# Or rejected enemies specifically
pixelforge generate --category enemy --status rejected --force
```

Note: `--force` is needed because the prompt has not changed — you are regenerating the same prompt hoping for a better result from the model.

### Cost-Controlled Batches

Generate assets in budget-controlled batches:

```bash
# First batch: high-priority assets, $5 budget
pixelforge generate --all --priority 2 --cost-limit 5.00

# Second batch: medium priority, another $5
pixelforge generate --all --priority 4 --cost-limit 5.00

# Third batch: everything else
pixelforge generate --all --cost-limit 10.00
```

### Add a New Biome

You defined a new biome with enemies, tiles, and backgrounds:

```bash
# Generate everything for the new biome
pixelforge generate --biome desert

# Or step by step
pixelforge generate --category tileset --biome desert
pixelforge generate --category enemy --biome desert
pixelforge generate --category battle-background --biome desert
```

### Regenerate After Palette Change

You updated a palette. Post-processing needs to rerun, but no API calls are needed:

```bash
# Reprocess only — no API calls
pixelforge process --all

# Or just the affected biome
pixelforge process --biome frost
```

---

## Manual Override System

Sometimes the AI cannot produce exactly what you need, and you want to hand-edit an asset. PixelForge supports manual overrides so your edits are not overwritten.

### How It Works

1. Generate the asset normally.
2. Edit the processed output file by hand (e.g., in Aseprite or Photoshop).
3. Mark the asset as manually overridden in the definition:

```yaml
id: frost-dragon
category: enemy
manualOverride: true
# ... rest of definition
```

4. Future `pixelforge generate` runs will skip this asset entirely, even with `--all` or `--force`.

### Removing an Override

To go back to generated output, set `manualOverride: false` (or remove the field) and regenerate:

```bash
pixelforge generate --id frost-dragon --force
```

### Partial Overrides

You can override individual animation frames by placing files in the expected location with a `.manual.png` suffix:

```
.pixelforge/processed/enemies/frost-dragon/
├── idle-0.png           # Generated
├── idle-1.manual.png    # Hand-edited (takes precedence)
├── attack-0.png         # Generated
├── attack-1.png         # Generated
└── attack-2.png         # Generated
```

PixelForge will use `.manual.png` files during spritesheet assembly instead of the generated versions.

---

## Cost Control

### --dry-run

Preview what would be generated without making API calls:

```bash
$ pixelforge generate --all --dry-run

Dry Run Summary
───────────────────────────────────
Category           Assets  Frames  Est. Cost
enemy                  24     216     $8.64
character               6      72     $2.88
tileset                 4      48     $1.92
ui                      8      24     $0.96
battle-background       4       4     $0.16
portrait                6      18     $0.72
icon                   12      12     $0.48
───────────────────────────────────
Total                  64     394    $15.76

Cached (skip):    280 frames
To generate:      114 frames
Estimated cost:    $4.56

Use without --dry-run to execute.
```

### --cost-limit

Set a per-session spending cap:

```bash
pixelforge generate --all --cost-limit 5.00
```

When the limit is reached, PixelForge stops generating and reports what was completed and what remains:

```
Cost limit reached ($5.00). Stopping generation.
  Completed: 125/394 frames
  Remaining: 269 frames (~$10.76)
  Run again to continue from where you left off (cached frames won't re-generate).
```

### Cost Tracking

View historical spending:

```bash
pixelforge cost
pixelforge cost --session   # Current/last session only
```

---

## Status Lifecycle

Every asset moves through a status lifecycle:

```
pending → generated → approved
                   ↘ rejected → (regenerate) → generated → ...
```

| Status | Meaning |
|--------|---------|
| `pending` | Defined but not yet generated. |
| `generated` | API output exists and post-processing is complete. Awaiting review. |
| `approved` | Reviewed and accepted. Ready for export. |
| `rejected` | Reviewed and rejected. Needs regeneration (tweak prompt or use `--force`). |

### Filtering by Status

```bash
# Generate only pending assets (initial generation)
pixelforge generate --all --status pending

# Regenerate rejected assets
pixelforge generate --all --status rejected --force

# Export only approved assets
pixelforge export --target ./my-game/assets --status approved
```

### Status in the Review Server

The review server (`pixelforge review`) provides a visual interface for approving and rejecting assets. Status changes are saved to the manifest and persist across sessions.
