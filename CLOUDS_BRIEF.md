# Clouds Redesign Brief

**Date:** 2026-05-13 (amended 2026-05-13 — color pivot from sunset cream → overcast gray + translucency + PS2 stylization)
**Status:** Approved by Alex (visual brainstorm 2026-05-13). Ready for implementation plan.
**Scope:** Replace the existing five-system cloud setup in `src/scene/index.js` with a single coherent cloud system. Visual + behavioral redesign; the underlying scene composition (tower at origin, camera orbit, fog) is preserved.

---

## 1. Problem

The scene currently runs five concurrent cloud systems — `midClouds`, `driftClouds`, `emberClouds`, `hazeClouds`, `pulseClouds` — totalling ~128 cloud entities at the desktop quality tier. Their orientations, motion vectors, and altitudes overlap in conflicting ways. The reading is "criss-cross" and busy. STYLE.md calls for calm, alignment, restraint, and motion that is structural rather than decorative; the current cloud setup violates all four.

## 2. Goals

- A single coherent cloud system replaces the five existing systems.
- Clouds read as uniformly oriented and symmetric (no criss-cross), with no perceived independent motion.
- The scene composition gains a cinematic intersection moment: the orbiting camera grazes through 2–3 clouds per full revolution.
- Cloud presence remains gated by the existing `scene.setClouds(on)` / `scene.toggleClouds()` public API; no new toggles surface to consumers.

## 3. Non-goals

- Reworking the tower, ground, orbit math, fog values, or any other scene element.
- Adding beat/audio/cursor reactivity. The site has none and is not getting any here.
- Volumetric raymarched clouds. Out of scope for this site's performance budget and visual register.
- Multiple cloud "weather" modes. One coherent atmospheric look only.
- Mobile/low-power-specific visual variants beyond cloud-count scaling.

## 4. Visual specification

### 4.1 Cloud bodies

- Soft, puffy, alpha-blended.
- **Color**: cool gray rain-cloud palette. Deep slate base, mid blue-gray body, palest gray catching the top edges. No warm cream or peach — the clouds read as overcast / rain weather, not sunset. Ties to STYLE.md's "soot" and "twilight stone" backgrounds; amber/brass accents stay on the page UI, not the sky.
- **Translucency**: each cloud renders at ~0.7–0.8 overall opacity so the sky bleeds through. Reinforces the rain mood and prevents the clouds reading as opaque blocks.
- **Visual register**: cel-shaded stepped value bands within each cluster — 3–4 discrete tiers (shadow base → mid slate → lit gray → palest top edge) with soft transitions, not smooth gradients. PS2-era stylized, halfway between photoreal volumetric and PS1 facets.
- Each cloud has **real depth** (built from a cluster of soft semi-transparent primitives, not a flat sprite). This is what allows the camera to pass through them rather than past them.
- Edges feather softly into the sky.

### 4.2 Horizon haze band

- A separate, low, wide, soft-edged atmospheric band sitting near the implied horizon line.
- Single continuous strip, 360° around the tower at far radius (past the scatter zone, fading into the fog).
- Cool muted slate — warmer than the sky behind it, slightly lighter than the cloud bases above it. Stays gray-family with the new rain palette; no warm cream.
- Fades with `setClouds(false)` alongside the clouds (treated as one atmospheric system, one API toggle).

### 4.3 Palette tie-in

- Cloud base slate: deep cool gray, in the soot / twilight-stone family already used in the scene's sky gradient.
- Cloud mid: mid blue-gray, slightly desaturated so it reads as overcast rather than stylized.
- Cloud top edge: palest gray (not pure white), catching what little light reaches the cloud tops on an overcast day.
- Horizon haze: muted slate, between cloud bases and sky background.
- All values must read calmly against the deep-navy / soot / twilight-stone sky gradient already in the scene. Warm accents (amber, brass, peach) stay reserved for the page UI text and accents — they do NOT appear in the cloud rendering.

## 5. Spatial layout

- **Cloud count**: 10 (desktop). Scaled down by quality tier: ~6 on mobile, ~4 on low-power (exact tier values land in the plan).
- **Distribution radii from world origin**: 45–65 units. The camera orbits at radius ~52, so clouds straddle the orbit path on both sides. A subset (2–3) sits within radius 50–54 specifically to create the cinematic intersection moment.
- **Altitude range**: y = 22–32. Camera height is ~21 and the tower top is below this, so clouds read as "above the tower." The lowest clouds graze camera height during orbit intersection.
- **Angular distribution**: roughly even around the 360° orbit with light random jitter, so intersection moments don't fire at a predictable cadence.
- **Cloud size variation**: 3–4 size variants (small / medium / large) assigned randomly. Variation supports realism without breaking the "uniformly oriented" promise — variation in *size* is fine, variation in *tilt* is what gets rejected.
- **Horizon haze radius / altitude**: radius ~80–90 (past the active scatter zone, fading into fog), altitude y ≈ 0–4 (just above the implied horizon line).

## 6. Motion specification

- **Clouds and haze are world-fixed.** No drift, no rotation, no scale-breathing, no opacity pulse.
- **All apparent motion comes from the camera orbit.** This is the only motion in the cloud layer.
- **Cinematic intersection**: 2–3 clouds positioned on or near the orbit path (radius 50–54) such that the camera passes through them during each revolution. Cloud depth (built from a cluster of primitives, not a flat plane) makes the intersection read as flying through volume rather than punching through a sprite.
- **Reduced-motion**: `prefers-reduced-motion: reduce` is already respected by the scene-level orbit speed gate elsewhere in the codebase. Stationary clouds inherit this automatically with no new handling.

## 7. Technical approach

Three options considered for the "real depth" requirement:

| Option | Description | Verdict |
|---|---|---|
| **A. Sphere clusters** | Each cloud = 5–8 soft alpha-blended sphere meshes clustered with random offsets. | **Selected.** Simple, deterministic, easy to tune, ~60 mesh instances total (less than half current). |
| B. Layered planes | Each cloud = 3–5 stacked semi-transparent planes with slight z-offsets. | Rejected. Camera-intersection causes plane-ordering glitches; less convincing volume. |
| C. Custom volumetric shader | Noise-driven raymarched cloud. | Rejected. Performance + complexity exceed the site's budget and visual register. |

**Sphere cluster implementation notes (plan-level detail; final shape lives in the plan):**

- Each cloud is a `THREE.Group` containing 5–8 `THREE.Mesh` instances using a low-poly soft sphere geometry (icosahedron with low subdivisions, or `SphereGeometry` with reduced segments).
- Material: `MeshBasicMaterial` (or equivalent) with `transparent: true` and `opacity ≈ 0.78`. Soft alpha falloff at sphere edges. Color comes from a cool slate-gray ramp applied via per-vertex colors or a simple Lambert-like custom shader with `vec3 lightDir = (0, 1, 0.5)`; shading produces 3–4 discrete value tiers (cel-shaded), not a smooth gradient.
- Spheres within a cluster are positioned with small random offsets in x/y/z; sized with small random scale variation. This gives the puffy silhouette without per-cloud authoring.
- PS2-stylized texture: a very subtle dither (alpha-mapped 2×2 stipple) is applied as a screen-space pattern via a post-pass or a quad overlay — strength roughly equivalent to PS2 framebuffer dithering, not aggressive enough to read as PS1 pixel-art.

## 8. Quality tier scaling

`quality.js` profile counts get reduced from six cloud-related knobs (`midCloudTextures`, `midCloudSprites`, `driftClouds`, `emberClouds`, `hazeClouds`, `pulseClouds`) to a single `cloudCount` knob:

- Desktop: 10
- Mobile: 6
- Low-power: 4

Exact values land in the implementation plan after a manual look at the orbit.

## 9. Migration / cleanup

### Remove from `src/scene/index.js`

- All five cloud-system construction blocks: mid (textures + sprites), drift, ember, haze, pulse.
- The shared `cloudGroups` array and the `setCloudGroupSceneVisibility` / `applyCloudVisibility` helpers (these get reimplemented for the new single system, preserving public API).
- Cloud-atlas texture loading + the `cloudAtlasSize` config (no atlas needed for the sphere-cluster approach).
- The decorative system registrations for `midClouds` (and analogues if present for the other cloud systems).

### Remove from `quality.js`

- `midCloudTextures`, `midCloudSprites`, `driftClouds`, `emberClouds`, `hazeClouds`, `pulseClouds`, `cloudAtlasSize`. Replace with `cloudCount` per tier.

### Preserve

- `scene.setClouds(on)` and `scene.toggleClouds()` public API on the scene module. Behavior unchanged for consumers; just routes to the new system.
- `cloudAnchor` Group concept (the system still benefits from a single parent Group for the toggle hook). It is repositioned to whatever altitude the new clouds want.

### Add

- New module or section: cloud cluster construction (one function, takes the scene + quality profile, returns the parent Group).
- Horizon haze band construction (one function, returns the band mesh).
- Single new entry in `quality.js`: `cloudCount`.

## 10. Acceptance criteria

1. The scene renders 10 (desktop) / 6 (mobile) / 4 (low-power) translucent cool-gray rain clouds with cel-shaded stepped values (deep slate base → mid slate → lit gray → palest top edge), floating above the tower at altitude y = 22–32, distributed at radii 45–65 from origin.
2. Each cloud renders at ~0.7–0.8 overall opacity; the sky is visibly bleeding through.
3. A muted slate horizon haze band sits below the clouds, 360° around the tower.
4. The orbiting camera passes through 2–3 clouds per full revolution; intersection reads as flying through volume, not punching through a sprite.
5. No cloud drifts, rotates, breathes, or pulses on its own. The orbit is the only motion in the cloud layer.
6. `scene.setClouds(false)` hides both clouds and the haze band. `setClouds(true)` restores them. `toggleClouds()` flips.
7. `quality.js` no longer references any of the legacy cloud knobs. A single `cloudCount` knob remains.
8. A PS2-style dither overlay is present, subtle (not pixel-art-grade), visible only on close inspection.
9. `npm run verify` and `npm test` pass.
10. Total cloud-related mesh instance count ≤ 60 (down from ~128).

## 11. Risks

| Risk | Mitigation |
|---|---|
| Camera-cloud intersection alpha-sorting glitches | Sphere clusters with proper material setup avoid the worst of this; the plan includes a manual orbit-and-watch verification step. |
| Cool-gray clouds read as washed-out / wallpaper against the navy sky | Cel-shaded stepped value tiers (4 discrete shades per cluster) ensure clear silhouette readability. Tower silhouette contrast against clouds is verified manually before merge. |
| Translucent clouds let the sky's deepest color show through and lose silhouette in dark-sky regions | The palest top-edge tier is bright enough to read against any sky band. Verified manually during the orbit-and-watch step. |
| Quality-tier scaling produces too few clouds on mobile to ever trigger an intersection | Acceptable — the cinematic moment is desktop-tier delight, mobile gets static atmospheric depth without forced intersection. Documented in plan. |
| Sphere cluster + alpha blend tanks framerate on low-power | Low-power tier already drops to 4 clouds × ~5 spheres = ~20 meshes, well under current count. If still an issue, low-power falls back to layered-plane approach for clouds (plan contingency). |

## 12. Out of scope (future ideas)

- Alternate weather palettes (sunset / dawn / clear-blue cloud variants).
- Subtle audio reactivity (the site has no audio; this would be a separate brief).
- Volumetric god rays through the clouds.
- Per-cloud authored shapes (rather than algorithmic sphere clusters).
- Rain particles falling from the clouds (the rain palette is mood-only; no precipitation).

These are captured here so they aren't lost, but no implementation work is planned for them in this brief.
