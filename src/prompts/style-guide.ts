export const MASTER_STYLE = `SNES-era 16-bit pixel art sprite, in the style of Final Fantasy IV and Final Fantasy V on Super Nintendo. Clean pixel art with visible individual pixels. Limited color palette. Black outline on all elements. No anti-aliasing. No gradients. No modern rendering. Pure retro 16-bit pixel art.`;

export const NEGATIVE_PROMPT = `3D render, realistic, photorealistic, smooth shading, gradient, anti-aliased, blurry, modern art style, high resolution photograph, AI artifacts, noise, watermark, text, signature, border, frame`;

export const SIZE_HINTS: Record<string, string> = {
  '16': 'Extremely simplified pixel art. 2-3 colors per element. Iconic silhouette. Every pixel matters.',
  '32': 'Clean readable pixel art sprite. 4-6 colors for main body. Small details possible. Clear silhouette against any background.',
  '48': 'Detailed SNES pixel art. Room for facial features, armor detail. 2-3 tone ramp per material for shading.',
  '64': 'Richly detailed pixel art. Full character detail, distinct equipment, expressive poses. Multiple shading tones per material.',
};

export const CHARACTER_POSES: Record<string, string> = {
  'idle': 'Standing upright in 3/4 view, arms at sides, relaxed but ready battle stance',
  'walk-down': 'Mid-stride walking toward the camera, one foot forward, slight body bob',
  'walk-up': 'Mid-stride walking away from camera, seen from behind, one foot forward',
  'walk-left': 'Mid-stride walking to the left, side profile view, arms swinging',
  'walk-right': 'Mid-stride walking to the right, side profile view, arms swinging',
  'attack': 'Dynamic attacking pose lunging forward with weapon extended, action lines energy',
  'cast': 'Arms raised channeling magic, glowing energy particles around hands',
  'hurt': 'Recoiling backward from a hit, slight lean back, pained expression',
  'death': 'Collapsed on the ground, eyes closed, body limp',
};

export const ENEMY_POSES: Record<string, string> = {
  'idle': 'Facing right in menacing battle stance, ready to attack, slightly animated',
  'attack': 'Lunging to the right aggressively, body in full attack motion',
  'hurt': 'Flinching from impact, knocked slightly to the left, showing pain',
  'death': 'Dissolving or breaking apart, fading away, defeated',
};

export const BACKGROUND_INSTRUCTION = `The sprite must be on a solid magenta (#FF00FF) background. No ground, no shadow, no environment — just the sprite on flat magenta.`;
