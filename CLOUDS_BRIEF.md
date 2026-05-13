# Clouds Redesign Brief

**Date:** 2026-05-13
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
- **Color**: warm cream base with an amber/peach edge lift on the top-facing surfaces — late-afternoon light catching the cloud tops. Bottoms sit in soft cooler twilight cream. Ties to STYLE.md's "amber, brass, soft peach" accent range and "twilight stone" backgrounds.
- Each cloud has **real depth** (built from a cluster of soft semi-transparent primitives, not a flat sprite). This is what allows the camera to pass through them rather than past them.
- Edges feather softly into the sky.

### 4.2 Horizon haze band

- A separate, low, wide, soft-edged atmospheric band sitting near the implied horizon line.
- Single continuous strip, 360° around the tower at far radius (past the scatter zone, fading into the fog).
- Slightly cooler twilight cream — warmer than the sky behind it, cooler than the cloud tops above it.
- Fades with `setClouds(false)` alongside the clouds (treated as one atmospheric system, one API toggle).

### 4.3 Palette tie-in

- Cloud cream: warm off-white in the same family as the site's parchment text color (avoid pure white).
- Cloud top-edge amber: in the brass/peach range used elsewhere on the site.
- Horizon haze: cooler twilight cream, sits between cloud cream and sky background.
- All values must read calmly against the deep-navy/soot/twilight-stone sky gradient already in the scene.

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
- Material: `MeshBasicMaterial` (or equivalent) with `transparent: true`, soft alpha falloff at sphere edges. Top-facing surfaces tinted with the amber/peach lift; bottom-facing surfaces in cooler cream. Achieved via per-vertex colors or a custom shader with a `vec3 lightDir = (0, 1, 0.5)` approximation — whichever lands cleanest in the plan.
- Spheres within a cluster are positioned with small random offsets in x/y/z; sized with small random scale variation. This gives the puffy silhouette without per-cloud authoring.

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

1. The scene renders 10 (desktop) / 6 (mobile) / 4 (low-power) puffy warm-cream clouds with amber/peach top edges, floating above the tower at altitude y = 22–32, distributed at radii 45–65 from origin.
2. A soft horizon haze band sits below the clouds, 360° around the tower.
3. The orbiting camera passes through 2–3 clouds per full revolution; intersection reads as flying through volume, not punching through a sprite.
4. No cloud drifts, rotates, breathes, or pulses on its own. The orbit is the only motion in the cloud layer.
5. `scene.setClouds(false)` hides both clouds and the haze band. `setClouds(true)` restores them. `toggleClouds()` flips.
6. `quality.js` no longer references any of the legacy cloud knobs. A single `cloudCount` knob remains.
7. `npm run verify` and `npm test` pass.
8. Total cloud-related mesh instance count ≤ 60 (down from ~128).

## 11. Risks

| Risk | Mitigation |
|---|---|
| Camera-cloud intersection alpha-sorting glitches | Sphere clusters with proper material setup avoid the worst of this; the plan includes a manual orbit-and-watch verification step. |
| Sunset amber lift competes with the existing twilight palette | Color values chosen conservatively from the existing palette range, not invented. The plan includes a visual review pass against the live site before merge. |
| Quality-tier scaling produces too few clouds on mobile to ever trigger an intersection | Acceptable — the cinematic moment is desktop-tier delight, mobile gets static atmospheric depth without forced intersection. Documented in plan. |
| Sphere cluster + alpha blend tanks framerate on low-power | Low-power tier already drops to 4 clouds × ~5 spheres = ~20 meshes, well under current count. If still an issue, low-power falls back to layered-plane approach for clouds (plan contingency). |

## 12. Out of scope (future ideas)

- Time-of-day variation (e.g. evening / dawn / overcast cloud palettes).
- Subtle audio reactivity (the site has no audio; this would be a separate brief).
- Volumetric god rays through the clouds.
- Per-cloud authored shapes (rather than algorithmic sphere clusters).

These are captured here so they aren't lost, but no implementation work is planned for them in this brief.
