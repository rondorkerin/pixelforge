# Caching

PixelForge uses content-addressable caching to avoid redundant API calls. If nothing has changed, re-running generation costs nothing. This makes the tool cost-efficient for iterative workflows where you frequently regenerate subsets of your assets.

## How It Works

### Cache Key

Every generation is keyed by a SHA-256 hash of the inputs that affect the output:

```
SHA-256(
  prompt           +  # The engineered prompt sent to the API
  provider         +  # e.g., "openai"
  model            +  # e.g., "gpt-image-1"
  imageSize        +  # e.g., "1024x1024"
  quality          +  # API quality parameter
  animationName    +  # e.g., "idle"
  frameIndex          # e.g., 0
)
```

This means:
- Change the prompt (or anything that affects it, like `promptHints` or `visualTraits`) and the cache key changes, triggering regeneration.
- Change the provider or model and the cache key changes.
- Change post-processing settings (palette, target size) and the cache key does **not** change — only post-processing reruns, not API generation.

### Cache Hits vs. Misses

On each generation run:

1. PixelForge computes the cache key for the asset/frame.
2. It checks if a file exists at `.pixelforge/cache/<hash>.png`.
3. **Cache hit** — The raw image is already on disk. PixelForge skips the API call and proceeds directly to post-processing. No cost incurred.
4. **Cache miss** — No cached image exists for this hash. PixelForge calls the API, saves the raw output to the cache, then runs post-processing.

```
Generate request
  → Compute SHA-256 hash
  → Check cache/
  → HIT?  → Skip API, run post-processing
  → MISS? → Call API → Save to cache/ → Run post-processing
```

### What Triggers a Cache Miss

| Change | Cache Miss? | API Call? |
|--------|------------|-----------|
| Edit `promptHints` | Yes | Yes |
| Edit `visualTraits` | Yes | Yes |
| Change `palette` | No | No (post-processing only) |
| Change `targetWidth`/`targetHeight` | No | No (post-processing only) |
| Change API provider or model | Yes | Yes |
| Add a new animation frame | Yes (new frame only) | Yes (new frame only) |
| Remove an animation frame | No | No |
| Change `fps` or `loop` | No | No (metadata only) |
| Use `--force` flag | Bypassed | Yes |

## Cache Directory Structure

The cache lives inside the PixelForge working directory:

```
.pixelforge/
├── cache/
│   ├── a1b2c3d4e5f6...abc.png     # Raw 1024x1024 images, named by hash
│   ├── b2c3d4e5f6a7...bcd.png
│   ├── c3d4e5f6a7b8...cde.png
│   └── ...
├── cache-index.json                 # Maps asset/frame → hash for quick lookup
├── raw/                             # Organized copies (symlinks to cache/)
│   └── enemies/
│       └── frost-dragon/
│           ├── idle-0.png
│           └── idle-1.png
├── processed/                       # Post-processed output
│   └── enemies/
│       └── frost-dragon/
│           ├── frost-dragon.png     # Assembled spritesheet
│           └── frost-dragon.json    # Metadata
└── manifest.json                    # Full generation manifest
```

### cache-index.json

The cache index provides a human-readable mapping from asset IDs to cache hashes:

```json
{
  "frost-dragon/idle/0": {
    "hash": "a1b2c3d4e5f6...abc",
    "timestamp": "2025-01-15T10:30:00Z",
    "provider": "openai",
    "model": "gpt-image-1",
    "cost": 0.04
  },
  "frost-dragon/idle/1": {
    "hash": "b2c3d4e5f6a7...bcd",
    "timestamp": "2025-01-15T10:30:02Z",
    "provider": "openai",
    "model": "gpt-image-1",
    "cost": 0.04
  }
}
```

## Bypassing the Cache

### --force Flag

Use `--force` to skip the cache and regenerate regardless of whether cached output exists:

```bash
# Force regenerate a single asset
pixelforge generate --id frost-dragon --force

# Force regenerate all enemies
pixelforge generate --category enemy --force
```

The old cached files are not deleted. The new output overwrites them with the new hash. This means reverting a prompt change will still be a cache hit on the old hash.

### Deleting the Cache

To force full regeneration of everything, delete the cache directory:

```bash
rm -rf .pixelforge/cache/
rm -f .pixelforge/cache-index.json

# Then regenerate
pixelforge generate --all
```

This is the nuclear option. Only do this if you want to regenerate every asset from scratch. Alternatively, use `--force` with scope flags to surgically regenerate specific assets.

## Cost Efficiency

The caching system is designed around a core insight: **prompt iteration is the main workflow**. You define assets, generate them, review the results, tweak prompts, and regenerate. Without caching, every run would re-generate everything, even assets you have already approved.

With caching:

| Scenario | API Calls | Cost |
|----------|-----------|------|
| First run (100 assets, ~300 frames) | 300 | ~$12.00 |
| Tweak 5 enemy prompts, regenerate | 5 | ~$0.20 |
| Change a palette, reprocess all | 0 | $0.00 |
| Add 10 new assets | 10 | ~$0.40 |
| Re-run without changes | 0 | $0.00 |

Over a typical development cycle, caching reduces total API costs by 80-95% compared to regenerating everything on each run.

## Post-Processing Cache

Post-processing (background removal, downscaling, palette enforcement, assembly) is always re-run from the cached raw images. This is intentional — post-processing is fast (milliseconds per asset) and you frequently want to change post-processing settings without re-generating raw images.

If you want to avoid even the post-processing cost (negligible in practice), the processed output in `.pixelforge/processed/` persists between runs. `pixelforge export` copies from processed output, so exporting after a no-op generation is essentially free.
