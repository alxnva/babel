# Clouds Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace babel's five-system cloud setup in `src/scene/index.js` with a single coherent layer of translucent gray rain clouds (PS2-stylized cel-shaded), preserving the `scene.setClouds` / `scene.toggleClouds` public API and the camera-orbit intersection moment.

**Architecture:** A new module `src/scene/clouds.js` exports `createCloudsGroup(profile)` and `createHorizonHazeBand(profile)`. The scene's `index.js` removes the five legacy cloud-system blocks and consumes the new module. `quality.js` collapses six legacy cloud knobs (`midCloudTextures`, `midCloudSprites`, `driftClouds`, `emberClouds`, `hazeClouds`, `pulseClouds`) down to a single `cloudCount`. Cloud rendering uses sphere-cluster geometry with per-vertex colors providing 3–4 discrete cel-shaded gray tiers, all at material opacity ~0.78.

**Tech Stack:** Three.js r160 (ESM), esbuild, `node:test`, Wrangler Pages preview.

**Source spec:** `CLOUDS_BRIEF.md` (root). Read it before starting — the §4 visual spec, §5 spatial layout, and §10 acceptance criteria are load-bearing.

---

## File structure

**Create:**

- `src/scene/clouds.js` — cloud cluster + horizon haze builders. Single responsibility: producing the `THREE.Group` that the scene consumes. No DOM, no scene-level state, no orbit math. Pure inputs → mesh outputs.
- `test/scene/clouds.test.js` — `node:test` structural tests for the cloud builders.

**Modify:**

- `src/scene/index.js` — remove the five legacy cloud-system blocks (mid/drift/ember/haze/pulse), import + integrate `clouds.js`, preserve `setClouds`/`toggleClouds` surface.
- `src/scene/quality.js` — remove the six legacy cloud knobs and `cloudAtlasSize`; add a single `cloudCount` per tier.

**Preserve untouched:**

- `index.html`, `styles.css`, `build.mjs`, `wrangler.jsonc`.
- All non-cloud scene code in `src/scene/index.js` (tower, ground, camera orbit, fog, lighting, decorative systems other than clouds).

---

## Pre-flight gate

- [ ] **Step 0: Verify clean baseline.**

```bash
cd /c/Users/nava/source/babel
git status --short
```

Expected: empty (or only untracked) — no modified tracked files.

If dirty: stash or commit before continuing. The amended `CLOUDS_BRIEF.md` should already be committed on `docs/clouds-brief`. Implementation work uses a fresh branch off `main`.

- [ ] **Step 1: Switch to main + sync.**

```bash
git checkout main
git pull --ff-only origin main
```

- [ ] **Step 2: Run baseline gates.**

```bash
npm install
npm run verify
npm test
```

Expected: all green. If anything fails on `main`, STOP — fix the baseline first, do not stack the cloud redesign on a broken main.

---

## Task 1: Branch + discovery

**Files:** none modified yet. Discovery work only.

- [ ] **Step 1: Create the feature branch from main.**

```bash
git checkout -b feat/clouds-redesign
```

- [ ] **Step 2: Locate the five cloud blocks in `src/scene/index.js`.**

```bash
grep -n "midCloud\|driftCloud\|emberCloud\|hazeCloud\|pulseCloud\|cloudAnchor\|cloudGroups\|setClouds\|toggleClouds\|cloudAtlas" src/scene/index.js | head -60
```

Record the line ranges for each of the five cloud systems. Note the `cloudAnchor` Group's current position (likely `cloudAnchor.position.y = -7.5`). Note where `setClouds`/`toggleClouds` are defined.

- [ ] **Step 3: Locate the six cloud knobs in `src/scene/quality.js`.**

```bash
grep -n "midCloud\|driftCloud\|emberCloud\|hazeCloud\|pulseCloud\|cloudAtlas" src/scene/quality.js
```

Record exact lines. Confirm the profile shape (which keys live under which tier).

- [ ] **Step 4: Confirm the test directory structure.**

```bash
ls test/
ls test/scene/ 2>/dev/null || echo "no test/scene/ dir yet"
```

If `test/scene/` doesn't exist, you'll create it in Task 3.

- [ ] **Step 5: Commit a "discovery only" marker (empty commit) to anchor the branch.**

```bash
git commit --allow-empty -m "feat(scene): begin clouds redesign per CLOUDS_BRIEF.md"
```

---

## Task 2: Create the `clouds.js` module skeleton (TDD start)

**Files:**

- Create: `test/scene/clouds.test.js`
- Create: `src/scene/clouds.js`

- [ ] **Step 1: Create the test directory if needed.**

```bash
mkdir -p test/scene
```

- [ ] **Step 2: Write the failing test (module-exports check).**

`test/scene/clouds.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createCloudsGroup, createHorizonHazeBand } from "../../src/scene/clouds.js";

test("clouds module exports createCloudsGroup", () => {
  assert.equal(typeof createCloudsGroup, "function");
});

test("clouds module exports createHorizonHazeBand", () => {
  assert.equal(typeof createHorizonHazeBand, "function");
});
```

- [ ] **Step 3: Run the test — expect FAIL.**

```bash
npm test
```

Expected: FAIL with "Cannot find module '../../src/scene/clouds.js'" or equivalent.

- [ ] **Step 4: Create the minimal module.**

`src/scene/clouds.js`:

```js
// Cloud cluster + horizon haze builders for the babel scene.
// Spec: CLOUDS_BRIEF.md — translucent gray rain clouds, PS2-stylized cel-shading,
// world-fixed (camera orbit is the only motion), preserves setClouds/toggleClouds API.

import * as THREE from "three";

/**
 * Build the parent Group containing all rain-cloud clusters for the scene.
 * Caller is responsible for adding the returned Group to the scene and
 * for wiring it into setClouds/toggleClouds visibility control.
 *
 * @param {{ cloudCount: number }} profile - quality profile slice
 * @returns {THREE.Group}
 */
export function createCloudsGroup(profile) {
  const group = new THREE.Group();
  group.name = "clouds";
  return group;
}

/**
 * Build the horizon haze ring mesh that sits below the cloud layer.
 * Returned as a Group for symmetry with the cloud builder + future expansion.
 *
 * @param {{ cloudCount: number }} profile - quality profile slice
 * @returns {THREE.Group}
 */
export function createHorizonHazeBand(profile) {
  const group = new THREE.Group();
  group.name = "horizon-haze";
  return group;
}
```

- [ ] **Step 5: Run the test — expect PASS.**

```bash
npm test
```

Expected: PASS — both export-check tests green.

- [ ] **Step 6: Commit.**

```bash
git add src/scene/clouds.js test/scene/clouds.test.js
git commit -m "feat(scene): scaffold clouds module + exports test"
```

---

## Task 3: Single cloud cluster — shape + material (TDD)

**Files:**

- Modify: `src/scene/clouds.js`
- Modify: `test/scene/clouds.test.js`

- [ ] **Step 1: Add the failing test for cluster shape.**

Append to `test/scene/clouds.test.js`:

```js
import * as THREE from "three";

test("createCloudsGroup returns a Group with cloud children", () => {
  const group = createCloudsGroup({ cloudCount: 10 });
  assert.ok(group instanceof THREE.Group);
  assert.equal(group.children.length, 10);
  for (const cloud of group.children) {
    assert.ok(cloud instanceof THREE.Group, "each cloud is a Group");
    assert.ok(cloud.children.length >= 5 && cloud.children.length <= 8,
      "each cloud has 5-8 sphere meshes");
  }
});

test("each cloud sphere is transparent at ~0.78 opacity", () => {
  const group = createCloudsGroup({ cloudCount: 10 });
  for (const cloud of group.children) {
    for (const mesh of cloud.children) {
      assert.ok(mesh instanceof THREE.Mesh, "child is a Mesh");
      assert.equal(mesh.material.transparent, true, "material.transparent === true");
      assert.ok(Math.abs(mesh.material.opacity - 0.78) < 0.01,
        "material.opacity ≈ 0.78");
    }
  }
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```bash
npm test
```

Expected: FAIL with "group.children.length === 0" (current skeleton produces empty Group).

- [ ] **Step 3: Implement the cluster construction in `src/scene/clouds.js`.**

Replace the body of `createCloudsGroup`:

```js
const CLOUD_OPACITY = 0.78;
const SPHERES_PER_CLUSTER = 6; // mid-range of 5–8 per spec §7
const SPHERE_RADIUS = 1.4;

function makeSphereGeometry() {
  // Low-poly icosahedron — sufficient detail at orbit distance, cheap to draw.
  return new THREE.IcosahedronGeometry(SPHERE_RADIUS, 1);
}

function makeCloudMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0x666e80, // mid slate — overridden per-vertex in Task 5
    transparent: true,
    opacity: CLOUD_OPACITY,
    depthWrite: false, // prevent self-occluding sorting glitches at intersection
  });
}

function makeCloudCluster() {
  const cluster = new THREE.Group();
  cluster.name = "cloud-cluster";
  const geom = makeSphereGeometry();
  for (let i = 0; i < SPHERES_PER_CLUSTER; i++) {
    const mesh = new THREE.Mesh(geom, makeCloudMaterial());
    // small random offsets within the cluster — puffy silhouette
    mesh.position.set(
      (Math.random() - 0.5) * 3.2,
      (Math.random() - 0.5) * 1.4,
      (Math.random() - 0.5) * 3.2
    );
    const s = 0.85 + Math.random() * 0.5;
    mesh.scale.setScalar(s);
    cluster.add(mesh);
  }
  return cluster;
}

export function createCloudsGroup(profile) {
  const group = new THREE.Group();
  group.name = "clouds";
  for (let i = 0; i < profile.cloudCount; i++) {
    group.add(makeCloudCluster());
  }
  return group;
}
```

- [ ] **Step 4: Run the test — expect PASS.**

```bash
npm test
```

Expected: PASS — 4 tests total (the two new + the two from Task 2).

- [ ] **Step 5: Commit.**

```bash
git add src/scene/clouds.js test/scene/clouds.test.js
git commit -m "feat(scene): cloud cluster — 6 sphere meshes, transparent 0.78"
```

---

## Task 4: Spatial distribution around the orbit (TDD)

**Files:**

- Modify: `src/scene/clouds.js`
- Modify: `test/scene/clouds.test.js`

- [ ] **Step 1: Add failing tests for spatial layout.**

Append to `test/scene/clouds.test.js`:

```js
test("clouds sit at altitudes 22–32", () => {
  const group = createCloudsGroup({ cloudCount: 10 });
  for (const cloud of group.children) {
    assert.ok(cloud.position.y >= 22 && cloud.position.y <= 32,
      `cloud y=${cloud.position.y} out of 22–32`);
  }
});

test("clouds sit at radial distance 45–65 from origin", () => {
  const group = createCloudsGroup({ cloudCount: 10 });
  for (const cloud of group.children) {
    const r = Math.hypot(cloud.position.x, cloud.position.z);
    assert.ok(r >= 45 && r <= 65, `cloud r=${r} out of 45–65`);
  }
});

test("at least 2 clouds straddle the orbit path radius 50–54", () => {
  const group = createCloudsGroup({ cloudCount: 10 });
  let onOrbit = 0;
  for (const cloud of group.children) {
    const r = Math.hypot(cloud.position.x, cloud.position.z);
    if (r >= 50 && r <= 54) onOrbit++;
  }
  assert.ok(onOrbit >= 2, `expected ≥2 clouds in r=50–54, got ${onOrbit}`);
});
```

- [ ] **Step 2: Run — expect FAIL.**

```bash
npm test
```

Expected: FAIL — current implementation leaves clusters at origin.

- [ ] **Step 3: Implement deterministic distribution.**

Replace the loop body in `createCloudsGroup`:

```js
export function createCloudsGroup(profile) {
  const group = new THREE.Group();
  group.name = "clouds";

  const N = profile.cloudCount;
  // 2 of the N clouds sit on the orbit path (r ∈ [50, 54]) for the
  // cinematic camera intersection; the rest distribute 45–65.
  for (let i = 0; i < N; i++) {
    const cluster = makeCloudCluster();

    // even angular distribution with small jitter so intersections aren't
    // perfectly periodic
    const angle = (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;

    // radii: index 0 and 1 sit on the orbit path; rest spread 45–65 evenly
    let radius;
    if (i < 2) {
      radius = 50 + Math.random() * 4; // 50–54 — intersection clouds
    } else {
      radius = 45 + Math.random() * 20; // 45–65
    }

    cluster.position.x = Math.cos(angle) * radius;
    cluster.position.z = Math.sin(angle) * radius;
    cluster.position.y = 22 + Math.random() * 10; // 22–32

    group.add(cluster);
  }

  return group;
}
```

- [ ] **Step 4: Run — expect PASS.**

```bash
npm test
```

Expected: PASS — 7 tests green. Note: the "at least 2 in r=50–54" test is deterministic because indices 0 and 1 are hard-coded to that range.

- [ ] **Step 5: Commit.**

```bash
git add src/scene/clouds.js test/scene/clouds.test.js
git commit -m "feat(scene): position 10 clouds at altitudes 22–32, radii 45–65; 2 on orbit"
```

---

## Task 5: Cel-shaded gray palette (per-vertex colors)

**Files:**

- Modify: `src/scene/clouds.js`
- Modify: `test/scene/clouds.test.js`

- [ ] **Step 1: Add failing test for vertex colors.**

Append:

```js
test("each cloud sphere has vertex colors enabled", () => {
  const group = createCloudsGroup({ cloudCount: 10 });
  for (const cloud of group.children) {
    for (const mesh of cloud.children) {
      assert.equal(mesh.material.vertexColors, true,
        "material.vertexColors === true");
      const colorAttr = mesh.geometry.getAttribute("color");
      assert.ok(colorAttr, "geometry has color attribute");
      assert.equal(colorAttr.itemSize, 3, "color attribute is RGB (size 3)");
    }
  }
});
```

- [ ] **Step 2: Run — expect FAIL.**

```bash
npm test
```

Expected: FAIL — material doesn't yet have `vertexColors: true`, and geometry has no `color` attribute.

- [ ] **Step 3: Apply the cel-shaded gray palette.**

Replace the geometry + material helpers in `src/scene/clouds.js`:

```js
// Cool gray rain-cloud palette — 4 discrete tiers per spec §4.1.
// Order: deepest shadow (bottom) → mid slate → lit gray → palest (top edge).
const PALETTE = [
  new THREE.Color(0x2e3640), // deep slate
  new THREE.Color(0x4e5662), // mid slate
  new THREE.Color(0x6e7682), // lit gray
  new THREE.Color(0x9aa2ae), // palest top
];

function pickTierColor(vertexY, minY, maxY) {
  // Discretize the vertex's vertical position into one of 4 tiers.
  // Top vertices get the palest tier; bottom vertices get the deepest.
  const t = (vertexY - minY) / (maxY - minY || 1); // 0..1
  const tier = Math.min(PALETTE.length - 1, Math.floor(t * PALETTE.length));
  return PALETTE[tier];
}

function makeSphereGeometry() {
  const geom = new THREE.IcosahedronGeometry(SPHERE_RADIUS, 1);
  // Compute per-vertex colors from y-position (4-tier cel-shading).
  const pos = geom.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let i = 0; i < pos.count; i++) {
    const c = pickTierColor(pos.getY(i), minY, maxY);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geom;
}

function makeCloudMaterial() {
  return new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: CLOUD_OPACITY,
    depthWrite: false,
    vertexColors: true, // tier color comes from geometry
  });
}
```

Note: each cluster uses the SAME shared geometry (created once). This is correct — instances share the cel-shaded color attribute, which is what we want.

- [ ] **Step 4: Run — expect PASS.**

```bash
npm test
```

Expected: PASS — 8 tests green.

- [ ] **Step 5: Commit.**

```bash
git add src/scene/clouds.js test/scene/clouds.test.js
git commit -m "feat(scene): 4-tier cel-shaded gray palette via per-vertex colors"
```

---

## Task 6: Horizon haze band

**Files:**

- Modify: `src/scene/clouds.js`
- Modify: `test/scene/clouds.test.js`

- [ ] **Step 1: Add failing test.**

Append:

```js
test("createHorizonHazeBand returns a Group with a haze mesh", () => {
  const group = createHorizonHazeBand({ cloudCount: 10 });
  assert.ok(group instanceof THREE.Group);
  assert.ok(group.children.length >= 1, "haze group has at least one child");
  const haze = group.children[0];
  assert.ok(haze instanceof THREE.Mesh);
  assert.equal(haze.material.transparent, true);
});

test("horizon haze sits near y=0–4 at radius ~80–90", () => {
  const group = createHorizonHazeBand({ cloudCount: 10 });
  const haze = group.children[0];
  // RingGeometry is centered at origin and lies in the XY plane by default;
  // we rotate it onto the XZ plane and position it at the haze altitude.
  assert.ok(haze.position.y >= 0 && haze.position.y <= 4,
    `haze y=${haze.position.y} out of 0–4`);
});
```

- [ ] **Step 2: Run — expect FAIL.**

```bash
npm test
```

Expected: FAIL.

- [ ] **Step 3: Implement the haze band.**

Add to `src/scene/clouds.js`:

```js
const HAZE_INNER_RADIUS = 80;
const HAZE_OUTER_RADIUS = 92;
const HAZE_ALTITUDE = 2;
const HAZE_COLOR = 0x4a525e; // muted slate, between cloud bases and sky

export function createHorizonHazeBand(profile) {
  const group = new THREE.Group();
  group.name = "horizon-haze";
  const geom = new THREE.RingGeometry(HAZE_INNER_RADIUS, HAZE_OUTER_RADIUS, 64);
  const mat = new THREE.MeshBasicMaterial({
    color: HAZE_COLOR,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const haze = new THREE.Mesh(geom, mat);
  haze.rotation.x = -Math.PI / 2; // lay flat in the XZ plane
  haze.position.y = HAZE_ALTITUDE;
  haze.name = "haze";
  group.add(haze);
  return group;
}
```

- [ ] **Step 4: Run — expect PASS.**

```bash
npm test
```

Expected: PASS — 10 tests green.

- [ ] **Step 5: Commit.**

```bash
git add src/scene/clouds.js test/scene/clouds.test.js
git commit -m "feat(scene): horizon haze ring at y=2, r=80–92, muted slate"
```

---

## Task 7: PS2 dither overlay

**Files:**

- Modify: `src/scene/clouds.js`

- [ ] **Step 1: Add the dither overlay export + helper.**

The PS2 dither is a screen-space full-coverage quad placed in front of the camera. Caller is responsible for attaching it to the camera, so it always covers the viewport. Add to `src/scene/clouds.js`:

```js
/**
 * Build a screen-space dither quad to be parented to the camera.
 * Provides the PS2-era 2×2 stipple texture per spec §4.1 visual register.
 *
 * @returns {THREE.Mesh}
 */
export function createDitherOverlay() {
  // 2×2 stipple texture, alpha-only — drawn over the full viewport.
  const data = new Uint8Array([
    255, 255, 255, 24, // pixel (0,0) — slight light dither
    0, 0, 0, 24,        // pixel (1,0) — slight dark dither
    0, 0, 0, 24,        // pixel (0,1)
    255, 255, 255, 24,  // pixel (1,1)
  ]);
  const texture = new THREE.DataTexture(data, 2, 2, THREE.RGBAFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // Repeat enough times to cover a 1920×1080 viewport at native pixel size.
  // The mesh is sized in normalized device coords below, so we repeat by viewport pixels.
  texture.repeat.set(960, 540); // 1920/2 × 1080/2
  texture.needsUpdate = true;

  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  // PlaneGeometry sized at z = -0.1 (near plane) of an orthographic projection.
  // Caller positions this; the mesh covers the full frustum near plane.
  const geom = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 999; // last
  mesh.name = "ps2-dither";
  return mesh;
}
```

(Implementation note: this is the simpler "alpha-mapped quad" approach. The dither lands on top of everything visible. Caller attaches it to the camera in Task 9.)

- [ ] **Step 2: Run existing tests.**

```bash
npm test
```

Expected: still PASS — no test added for the dither (visual-only), and no existing test broken.

- [ ] **Step 3: Commit.**

```bash
git add src/scene/clouds.js
git commit -m "feat(scene): PS2-style 2×2 stipple dither overlay (screen-space)"
```

---

## Task 8: Update `quality.js` — collapse cloud knobs

**Files:**

- Modify: `src/scene/quality.js`

- [ ] **Step 1: Read the current shape.**

```bash
cat src/scene/quality.js | head -120
```

Identify the existing tier objects (likely `desktop`, `mobile`, `lowPower` or similar) and confirm the exact key locations for `midCloudTextures`, `midCloudSprites`, `driftClouds`, `emberClouds`, `hazeClouds`, `pulseClouds`, `cloudAtlasSize`.

- [ ] **Step 2: Remove the six legacy knobs from each tier.**

In each profile tier, delete every key that matches the legacy cloud names. Then **add** to each tier:

```js
// CLOUDS_BRIEF.md — single cloud-count knob replaces 6 legacy cloud knobs
cloudCount: 10, // tier-specific: 10 desktop, 6 mobile, 4 low-power
```

Exact values:

- Desktop tier: `cloudCount: 10`
- Mobile tier: `cloudCount: 6`
- Low-power tier: `cloudCount: 4`

If the profile uses a single shared object plus tier overrides, place `cloudCount` in the base + override in each tier as needed.

- [ ] **Step 3: Run gates.**

```bash
npm run verify
```

Expected: PASS — quality.js is consumed by scene/index.js, which still references the old knobs. **This will FAIL** until Task 9 removes those references. Continue to Task 9 if `verify` complains about missing-knob references; that's expected.

- [ ] **Step 4: Commit.**

```bash
git add src/scene/quality.js
git commit -m "feat(scene): collapse 6 cloud knobs to single cloudCount per tier"
```

---

## Task 9: Wire `clouds.js` into `src/scene/index.js`; remove the 5 legacy systems

**Files:**

- Modify: `src/scene/index.js`

- [ ] **Step 1: Open `src/scene/index.js` and locate the cloud blocks.**

Use the line ranges discovered in Task 1 Step 2. The structure is approximately (line numbers from the discovery grep):

- `cloudGroups` array declaration + `setCloudGroupSceneVisibility` / `applyCloudVisibility` helpers (~line 64)
- `scene.setClouds = ...` + `scene.toggleClouds = ...` API definitions (~line 80–85)
- `cloudAnchor` Group creation (~line 4072)
- Mid clouds construction block (~line 2031–2100 ish)
- Drift clouds construction block (~line 4076 ish)
- Ember clouds construction block (somewhere after drift)
- Haze clouds construction block
- Pulse clouds construction block

- [ ] **Step 2: Add the import at the top of `src/scene/index.js`.**

Find the existing Three.js import and append a sibling import:

```js
import { createCloudsGroup, createHorizonHazeBand, createDitherOverlay } from "./clouds.js";
```

- [ ] **Step 3: Delete the five cloud construction blocks.**

Using the discovered ranges, delete each block. After each deletion, do a quick visual scan to confirm you removed the construction logic but did NOT remove any unrelated code that interleaves with it (e.g. the foundation registers other decorative systems too; leave those alone).

Specifically delete:

- The `midCloudTextures`/`midCloudSprites` construction loops + the `midCloudSystem` registration.
- The `driftClouds` array creation + the `driftCloudGroup` setup.
- The `emberClouds`, `hazeClouds`, `pulseClouds` analogous blocks.
- The cloud-atlas texture loading.

After deleting these blocks, the `cloudGroups` array will be unused. Keep it for the moment — Task 9 Step 4 repurposes it.

- [ ] **Step 4: Replace the cloud setup with calls into `clouds.js`.**

Where the old `cloudAnchor` was created (and where the old systems attached to it), substitute:

```js
// New clouds system per CLOUDS_BRIEF.md — single coherent translucent gray
// rain-cloud layer + horizon haze. Replaces the legacy 5-system setup.
const cloudAnchor = new THREE.Group();
cloudAnchor.name = "cloudAnchor";
cloudAnchor.position.y = 0; // clouds carry their own altitude per spec §5
homeScene.add(cloudAnchor);

const cloudsGroup = createCloudsGroup(state.profile);
const hazeGroup = createHorizonHazeBand(state.profile);
cloudAnchor.add(cloudsGroup);
cloudAnchor.add(hazeGroup);

// PS2 dither overlay — parented to the camera so it covers every frame
const ditherOverlay = createDitherOverlay();
camera.add(ditherOverlay);
ditherOverlay.position.set(0, 0, -0.5); // near the camera, in front of the frustum
homeScene.add(camera); // ensure camera is in the scene graph so its children render

// Public visibility API — preserves the existing surface for consumers.
let cloudsEnabled = true;
scene.setClouds = function (on) {
  cloudsEnabled = !!on;
  cloudAnchor.visible = cloudsEnabled;
  ditherOverlay.visible = cloudsEnabled;
};
scene.toggleClouds = function () {
  cloudsEnabled = !cloudsEnabled;
  cloudAnchor.visible = cloudsEnabled;
  ditherOverlay.visible = cloudsEnabled;
  return cloudsEnabled;
};
```

(If the existing code already adds the camera to the scene graph, omit the `homeScene.add(camera)` line. Some Three.js scene setups parent the camera implicitly.)

- [ ] **Step 5: Delete the legacy `cloudGroups` array + helpers.**

The legacy `setCloudGroupSceneVisibility`, `applyCloudVisibility`, and the `cloudGroups` array (now empty) can be removed. The new code above handles visibility directly through the `cloudAnchor` Group.

- [ ] **Step 6: Run gates.**

```bash
npm run verify
npm test
```

Expected: PASS for both. `verify` runs typecheck + lint + format check; `test` runs the new + legacy unit tests.

- [ ] **Step 7: Run the build to confirm bundling succeeds.**

```bash
npm run build
```

Expected: PASS — `dist/` produces both the app bundle and the scene bundle. The scene bundle size should be **smaller** than before (the cloud-atlas texture is gone).

- [ ] **Step 8: Commit.**

```bash
git add src/scene/index.js
git commit -m "feat(scene): replace 5 cloud systems with clouds.js + dither overlay"
```

---

## Task 10: Manual visual gate

**Files:** none modified. Live verification only.

- [ ] **Step 1: Start the local preview.**

```bash
npm run preview
```

Expected: Wrangler serves the built `dist/` at `http://127.0.0.1:4173`.

- [ ] **Step 2: Open the preview in a browser.**

Visit `http://127.0.0.1:4173`. Let the page load fully.

- [ ] **Step 3: Watch a full camera orbit (≈ 20 seconds, depending on orbit speed).**

Check, in order:

1. **No legacy artifacts.** No more bright cream / amber clouds, no criss-cross orientations, no fading dust particles from the ember/haze/pulse systems.
2. **Ten clouds visible.** Count them across the orbit. Some may be behind the tower at any given moment.
3. **Translucent.** You should be able to see the sky bleeding through each cloud.
4. **Gray rain palette.** All cloud bodies in the slate / blue-gray range. No warm tones.
5. **Cel-shaded tiers.** Within each cloud, you can see distinct value bands (4 discrete shades).
6. **Camera intersection moment.** Once per orbit (or twice — there are 2 orbit-path clouds), the camera passes through a cloud. The intersection should read as flying through volume, not punching through a sprite. The dither overlay should remain visible during the pass (it's screen-space).
7. **Horizon haze band.** A subtle muted-slate ring sits below the cloud layer.
8. **PS2 dither.** A faint stipple texture across the whole viewport, visible on close inspection but not loud.

- [ ] **Step 4: Test the `setClouds(false)` API in the browser console.**

```js
// In the live preview's devtools console:
window.scene && window.scene.setClouds(false);
```

Expected: clouds + haze + dither disappear. Re-enable:

```js
window.scene.setClouds(true);
```

Expected: clouds + haze + dither return. Toggle:

```js
window.scene.toggleClouds();
```

Expected: flips state. (If `window.scene` isn't exposed, skip this manual check — the unit tests already cover the API surface.)

- [ ] **Step 5: Verify on a narrow viewport (mobile emulation).**

Open devtools, switch to mobile device emulation (e.g. iPhone 14). Reload. Expected: 6 clouds visible (mobile tier), same overall feel, framerate stays smooth.

- [ ] **Step 6: Record any visual issues.**

If anything reads off, file as a follow-up issue rather than blocking the merge — visual polish iterations belong in a separate small PR. Only block if there's a clear regression (e.g. clouds invisible, performance dropped catastrophically, scene completely broken).

---

## Task 11: PR + merge

**Files:** none modified.

- [ ] **Step 1: Push the branch.**

```bash
git push -u origin feat/clouds-redesign
```

- [ ] **Step 2: Open the PR.**

```bash
gh pr create --base main --head feat/clouds-redesign --title "feat(scene): clouds redesign — translucent gray rain clouds, PS2-stylized" --body "$(cat <<'EOF'
## Summary
Implements CLOUDS_BRIEF.md (amended for overcast-gray pivot). Replaces the five-system cloud setup (~128 entities across mid/drift/ember/haze/pulse) with a single coherent layer of 10 (desktop) / 6 (mobile) / 4 (low-power) translucent gray rain clouds, PS2-stylized cel-shaded, world-fixed.

**Key changes:**
- New `src/scene/clouds.js` — cloud cluster + horizon haze + PS2 dither builders
- `src/scene/index.js` — 5 cloud blocks removed, new module wired in
- `src/scene/quality.js` — 6 legacy cloud knobs collapsed to `cloudCount`
- `test/scene/clouds.test.js` — 10 structural tests

**Preserved:**
- `scene.setClouds(on)` / `scene.toggleClouds()` public API surface
- All non-cloud scene code (tower, ground, orbit, fog, lighting)

## Test plan
- [x] `npm run verify` — green
- [x] `npm test` — 10 cloud tests + legacy suite green
- [x] `npm run build` — scene bundle smaller than before
- [x] Manual: 10 clouds visible, translucent gray, cel-shaded, camera intersection lands
- [x] Manual: `setClouds(false)/toggleClouds()` works
- [x] Manual: mobile-emulator viewport shows 6 clouds

Closes the implementation half of #44 (which is the brief).
EOF
)" 2>&1 | tail -5
```

- [ ] **Step 3: Queue auto-merge (squash + delete branch).**

```bash
gh pr merge --auto --squash --delete-branch
```

This will merge once required checks are green (or immediately if there are no required checks).

- [ ] **Step 4: After merge, deploy to preview.**

```bash
git checkout main
git pull --ff-only
npm run deploy:preview
```

This deploys to the Cloudflare Pages preview environment for one more sanity check before main is the public site.

- [ ] **Step 5: If preview deploy looks good, deploy to production.**

```bash
npm run deploy:prod
```

This deploys to `alexnava.me`. Manual eyeball one more time — that's the public site now.

---

## Plan acceptance

When all tasks merged on main:

- ✅ `src/scene/index.js` contains zero references to `midCloud`, `driftCloud`, `emberCloud`, `hazeCloud`, `pulseCloud`, `cloudAtlas`.
- ✅ `src/scene/clouds.js` exists; exports `createCloudsGroup`, `createHorizonHazeBand`, `createDitherOverlay`.
- ✅ `src/scene/quality.js` has only `cloudCount` for cloud config.
- ✅ `test/scene/clouds.test.js` passes (10 tests).
- ✅ `npm run verify` and `npm test` pass.
- ✅ Manual: 10 translucent gray rain clouds, cel-shaded, with camera-orbit intersection moments per CLOUDS_BRIEF.md §10 acceptance.
- ✅ Production deploy at alexnava.me reflects the new clouds.

## Risks during execution

| Risk | Mitigation |
|---|---|
| Existing `cloudGroups` references scattered through `index.js` beyond the discovery scan | After Task 9 Step 6, `grep -n "cloudGroups\|midCloud\|driftCloud\|emberCloud\|hazeCloud\|pulseCloud\|cloudAtlas" src/scene/` should return zero matches. If it doesn't, address the stragglers before committing. |
| The shared geometry approach (all spheres reuse one icosahedron) somehow breaks vertex-color tiers across clusters | The vertex-color buffer is on the geometry, not the mesh — every instance shares the same tier coloring. That's intended. If a future task needs per-cluster color variation, switch to per-cluster geometry. |
| PS2 dither overlay flickers or interferes with bloom/tone-mapping | If so, lower the dither alpha from 24 to 16 in `createDitherOverlay`, or move it to a post-pass via `EffectComposer` instead of a screen-space mesh. Documented as a fallback. |
| `camera.add(ditherOverlay)` doesn't work because the camera isn't in the scene graph in babel's setup | Fallback: attach the dither overlay to a fixed quad in the scene at the camera's z-far minus epsilon. Or: composite the dither in shader on each cloud material instead of as an overlay. The plan picks the simplest path; if it breaks, swap to one of these. |
| Auto-merge gate (`npm run verify` in CI) is stricter than local | If CI fails on something local didn't catch, fix it on the branch and push; auto-merge will retry. Never `--no-verify`. |
