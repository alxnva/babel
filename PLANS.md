# PLANS.md

## Backlog

Candidates for future work, roughly ordered by value. Pick from here when starting a new task.

| #   | Task                                          | Why it matters                                                                                                                   | Size     |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Add a lightweight local dev server            | `python -m http.server` doesn't apply `_headers` / `_redirects`; a dev server that honors both would close the preview/prod gap. | Small    |
| 2   | Create and commit an `og.png`                 | The `og:image`/`twitter:image` meta was removed because no asset existed. Social shares currently fall back to title-only cards. | Small    |
| 3   | Define a site mission / positioning statement | The "calm by design" tagline exists but there's no articulated mission guiding content decisions                                 | Thinking |
| 4   | Break up `src/scene/index.js`                 | At ~135 KB it's the last outsized module in `src/`. Split once the visual design is stable enough for a deeper refactor.         | Medium   |

> **Thinking** = not ready to build yet, needs more clarity before it becomes a task.

### Adding to the backlog

Anyone (human or agent) can propose additions. Keep entries to one line. Size is one of: **Small** (< 1 hour), **Medium** (a few hours), **Large** (multi-session), or **Thinking** (needs scoping).

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

### Repository reorg to `src/` + `dist/` layout

**Completed.** Landed a large improvements pass:

- Introduced an esbuild build step. Source of truth moved to `src/`; generated bundles now emit into `dist/scripts/` (gitignored).
- Self-hosted Three.js r128 (via the `three` devDependency, emitted to `dist/vendor/three.min.js`).
- Self-hosted Inter 400/600 and Cormorant Garamond 500/600 as latin-only woff2 subsets under `fonts/`.
- Tightened CSP to `'self'`-only for scripts, styles, fonts; dropped both `'unsafe-inline'` directives.
- Fixed `_headers`: immutable caching for `/scripts/*`, `/vendor/*`, `/fonts/*`; `must-revalidate` for HTML.
- Added `defer` to every `<script>`; removed dead inline scripts and `<noscript>` styles.
- Dropped stale `og:image`/`twitter:image` meta (tracked as backlog item 2).
- Broadened the scene's `lowPower` heuristic and added an `IntersectionObserver` gate on `#home-scene`.
- Rewrote the hero scroll fade to be rAF-driven with a dirty flag.
- Added an offscreen-canvas bitmap cache in `ui/icons.js`, keyed by DPR/state bucket.

### Structural map + phase headers in `main.js`

**Completed.** Added a top-level structural map comment and phase headers inside `initHomeScene()`. Comment-only change — no behavior altered.
