# PLANS.md

## Backlog

Candidates for future work, roughly ordered by value. Pick from here when starting a new task.

| #   | Task                                          | Why it matters                                                                                                           | Size     |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | Define a site mission / positioning statement | The "calm by design" tagline exists but there's no articulated mission guiding content decisions                         | Thinking |
| 2   | Break up `src/scene/index.js`                 | At ~135 KB it's the last outsized module in `src/`. Split once the visual design is stable enough for a deeper refactor. | Medium   |
| 3   | Address scene-interactions audit findings     | See `ART/scene-interactions.md`.                                                                                         | Medium   |
| 4   | Gate brazier / decorative arrays through visibility tracker | `arr23` (flames) and friends in `scene/index.js` update every frame even when camera-facing away. `plumeSystem` already shows the pattern via `registerDecorativeSystem`. Per-frame: 6+ `Math.sin`, inner ember loop, `setHSL` per light. | Small |
| 5   | Skip orbital-glow color buffer re-upload when `glowAmount` stable | `scene/index.js` rewrites the full color attribute and flags `needsUpdate` every frame, even during the long hold phase. Add a change-detection guard. | Small |
| 6   | Dispose `CubeCamera` + `WebGLCubeRenderTarget` after the one-shot env-map bake | Lives on `homeScene` for the page lifetime; only the captured `.texture` handle is needed by the consuming materials. Verify capture timing before disposing. | Small |
| 7   | Rename auto-generated identifiers in `src/scene/index.js` | The file currently reads as post-transform output (`arg22`, `num405`, `tmpV68`, `!0`/`!1`, comma-sequenced statements). Mechanical rename in waves; blocks deeper review of the scene module. | Large |
| 8   | Collapse `cloneProfile`/`cloneCompositionProfile` + remove parallel fallback in `scene/index.js` | `quality.js` exports the canonical profile shape; the ~110-line inline fallback literal in `index.js` (lines ~88-201) is unreachable (quality.js is imported first by `scene-entry.js`). Field-by-field clone makes every new flag a 3-place edit. | Medium |
| 9   | Refactor cloud visibility state in scene      | `cloudsEnabled` and `group.userData.sceneVisible` form redundant state with two helpers (`applyCloudVisibility` + `setCloudGroupSceneVisibility`) that overlap. Unify into one path; remove leftover comma-expression in `toggleClouds`. | Small |

> **Thinking** = not ready to build yet, needs more clarity before it becomes a task.

### Adding to the backlog

Anyone (human or agent) can propose additions. Keep entries to one line. Size is one of: **Small** (< 1 hour), **Medium** (a few hours), **Large** (multi-session), or **Thinking** (needs scoping).

---

## Current positioning

- Audience: creative peers first, broader visitors second
- Site role: sparse personal site, not a full portfolio hub
- Babel role: atmospheric influence, not explicit framing copy
- Public text: stay minimal; prefer small grounding changes over explanatory sections
- Resume: defer until there is a clearer reason to surface it

---

## Active task

_No active task. Pick one from the backlog or fill in the template below when starting new work._

<!-- When starting a task, replace the line above with a filled-in copy of the template below. -->

---

## Task template

Copy this when starting a new task. Delete the template instructions in parentheses.

```markdown
## Active task

### Objective

(One sentence: what are you doing and why.)

### Constraints

- Scope: (what's in and out of bounds)
- Approvals needed: (anything from the "ask before" list in AGENTS.md)
- Environment notes: (relevant limitations)

### Assumptions

(What you're taking as given. Flag anything uncertain.)

### Plan

1. (Step)
2. (Step)
3. (Step)

### Verification

- (How you'll confirm it worked — diff review, manual check, command output, etc.)

### Rollback

(How to undo this if it goes wrong.)

### Status

- [ ] Started
- [ ] Implementation complete
- [ ] Verified
- [ ] PLANS.md updated

### Completion notes

(Filled in when done. What happened, what changed, anything surprising.)
```

---

## Completed tasks

### Panel frame unification — re-do as Option A

**Completed 2026-05-05.** The first pass of `ART/last-pass.md` Section 3 shipped a "Plan C" that built neither Option A nor B — it inverted the panel hierarchy by making a Three.js notebook/letter scene the focal element with text crammed into a tiny absolute-positioned overlay. Re-did as actual Option A:

- Both panels now use a single shared `.panel-parchment` frame: same paper treatment, straight (no skew/rotate), same drop-shadow.
- About panel carries a large display "A" watermark (`.panel-parchment__watermark`) sitting behind the text — reads as a tooled cover initial.
- Contact panel carries a CSS-only wax seal (`.panel-parchment__seal`) in the lower-right.
- Text content is once again the focal element, in normal flow with a sensible content column (`max-width: 38ch`).
- Unwired the Three.js panel-object scene (`src/scene/panel-objects.js`) and the canvas panel-asset draw functions (`drawNotebookPanelAsset` / `drawLetterPanelAsset` formerly in `src/ui/icons.js`) — both were detailed creative assets, not scaffolding, so they were **parked** in `src/art/` rather than deleted. Tree-shaking keeps them out of the bundle until something imports them.
- Removed `revealPanelObject` plumbing from `src/ui/panels.js` and `enablePanelObjectFallback` from `src/main.js`.
- Dropped the metaphor-named `--notebook` / `--letter` modifier classes — variant identity now lives in the watermark / seal element each panel carries.
- Updated `test/markup-accessibility.test.mjs` to assert on the new ornament classes and the absence of `panel-object-stage`.

`src/art/` notes:

- `src/art/panel-objects.js` — the original Three.js scene, IIFE-style; re-enable by adding `import "../art/panel-objects.js";` to `src/scene-entry.js`, then call `site.scene.initPanelObjectArt()` and `site.scene.revealPanelObject(panelId)`.
- `src/art/panel-canvas-assets.js` — the two PSX-dither canvas paintings, exposed at `site.art.drawNotebookPanelAsset` / `site.art.drawLetterPanelAsset`. Helpers (fillPoly, applyPsxDither, etc.) are duplicated from `src/ui/icons.js` so the file is self-contained.

> Both files were deleted in the Tier A simplify pass (no imports, no callers). Recover from git history if needed.

### Postprocessing pipeline

**Completed.** Added a restrained global EffectComposer pipeline:

- Added tier-aware color grading, high-tier bloom, and balanced/high vignette + static grain.
- Kept developer-mode OutlinePass as the final interaction-feedback pass.
- Added quality-tier and postprocess factory tests so adaptive profile changes keep pass enablement deterministic.

### Repository reorg to `src/` + `dist/` layout

**Completed.** Landed a large improvements pass:

- Introduced an esbuild build step. Source of truth moved to `src/`; generated bundles now emit into `dist/scripts/` (gitignored).
- Self-hosted Three.js r128 (via the `three` devDependency, emitted to `dist/vendor/three.min.js`).
- Self-hosted Instrument Sans 400/600 and Cormorant Garamond 500/600 as latin-only woff2 subsets under `fonts/`.
- Tightened CSP to `'self'`-only for scripts, styles, fonts; dropped both `'unsafe-inline'` directives.
- Fixed `_headers`: immutable caching for `/scripts/*`, `/vendor/*`, `/fonts/*`; `must-revalidate` for HTML.
- Added `defer` to every `<script>`; removed dead inline scripts and `<noscript>` styles.
- Dropped stale `og:image`/`twitter:image` meta (tracked as backlog item 2).
- Broadened the scene's `lowPower` heuristic and added an `IntersectionObserver` gate on `#home-scene`.
- Rewrote the hero scroll fade to be rAF-driven with a dirty flag.
- Added an offscreen-canvas bitmap cache in `ui/icons.js`, keyed by DPR/state bucket.

### Structural map + phase headers in `main.js`

**Completed.** Added a top-level structural map comment and phase headers inside `initHomeScene()`. Comment-only change — no behavior altered.

### Roadmap foundation truthfulness + social share polish

**Completed.** Tightened the project contract and added the first understated public polish pass:

- Synced repo guidance so `README.md`, `AGENTS.md`, and `CLAUDE.md` all describe the same source-of-truth repo, preview flow, and verification contract.
- Added a Wrangler-backed local preview command so local review is closer to Cloudflare Pages than a plain static file server.
- Added a committed `og.png` asset and restored Open Graph / Twitter image metadata.
- Captured the current internal positioning stance so future copy changes can stay minimal and consistent.

### Cloudflare security baseline hardening

**Completed.** Formalized the static-site security contract and documented the Cloudflare edge assumptions:

- Kept `_headers` as the tracked source of truth for CSP, framing, MIME sniffing, permissions, COOP/CORP, and preload-capable HSTS.
- Added project-contract coverage so the self-only CSP, HSTS preload shape, missing CORS wildcard, and legacy redirect map cannot drift silently.
- Recorded that Cloudflare Web Analytics/RUM injection is disabled by design instead of widening `script-src` for `static.cloudflareinsights.com`.
- Clarified that custom-domain activation, `www` to apex redirects, production `*.pages.dev` handling, DNS/CAA, certificates, WAF, and response transforms remain Cloudflare-side settings to re-confirm before deploy or security mutations.

### Security and deferred-scene performance pass

**Completed.** Applied a focused repo-local polish pass:

- Scoped Cloudflare deploy secrets to only the workflow steps that validate or deploy with Wrangler.
- Split the browser payload into a lightweight UI boot bundle and a deferred Three.js scene bundle loaded after first paint.
- Kept source docs aligned with the generated `scripts/app.HASH.js` plus `scripts/scene.HASH.js` output shape.
