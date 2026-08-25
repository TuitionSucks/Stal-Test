# Stalzone Artifact Calculator — Chilly Prototype

Small browser-based test calculator for the **Chilly** artifact.

## Current scope

- Quality: **130%–145% (Rare band only)**
- Potential: **+0 to +15**
- Main stats: Vitality, Temperature, Frost, Burning
- Additional properties: Vitality, Burning reduction, Explosion Protection
- Additional slots unlock at +5, +10, and +15
- Known-answer checks for:
  - 143% +8 → +4.48% Vitality, -0.64 Temperature, +0.98 Frost, -0.66 Burning
  - 135% +6 → +4.08% Vitality, -0.58 Temperature, +0.90 Frost, -0.60 Burning

## Working formulas

Main scalable properties:

`base × (quality / 100) × (1 + 0.02 × potential)`

Chilly Frost inside the verified Rare band:

`0.85 + ((quality - 130) / 15) × 0.15`

Additional properties currently use the same quality/Potential multiplier after they are unlocked. This part is still being validated against live examples.

## Files

- `index.html` — calculator interface
- `style.css` — styling
- `artifacts.js` — artifact data
- `app.js` — calculation and UI logic
