# CLAUDE.md

Read these files before starting a task:

1. `AGENTS.md`
2. `STYLE.md`
3. `PLANS.md`
4. `README.md`

## Project

Authoritative working source for `alexnava.me`. JS source lives in `src/`; generated publish output lives in `dist/` and is gitignored. npm on Node.js 22+ is used for local build, preview, verification, deployment, and formatting. Lightweight automated tests live under `test/`.

## Key files

- `index.html` — homepage markup
- `styles.css` — styling and design tokens
- `src/scene/` — readable Three.js scene helpers, textures, palette, and scene bootstrap
- `src/ui/` — readable hero motion, icons, and panels
- `src/app.js` — lightweight UI bundle entry
- `src/main.js` — UI boot and deferred scene loader
- `src/scene-entry.js` — deferred Three.js scene bundle entry
- `build.mjs` — esbuild + asset assembly (source → `dist/`)
- `package.json` — build, verify, watch, deploy, format commands
- `_headers` / `_redirects` — hosting config copied into `dist/` at build time
- `wrangler.jsonc` — Cloudflare Pages project binding

## Commands

- Install: `npm install`
- Build to `dist/`: `npm run build`
- Preview locally: `npm run preview`
- Verify source entry points: `npm run verify`
- Run tests: `npm test`
- Watch: `npm run watch`
- Format: `npm run format`

## Rules

- Plan before editing when the task is multi-file or architectural
- Read `STYLE.md` before visual changes
- Keep diffs small and reversible
- Edit JS in `src/`; never hand-edit `dist/`
- Respect `prefers-reduced-motion` and `prefers-reduced-transparency`
- Don't install dependencies, push, deploy, or alter cloud settings without explicit approval
- Treat deployment details in repo docs as notes to confirm before shipping changes

## Operational notes (Claude steward, 2026-08-08)

- **Copy-sentinel coupling:** the visible tagline (`Built to hold up.`) is grepped as the
  deploy sentinel in `.github/scripts/smoke-pages.sh`, `.github/workflows/preview.yml`, and
  `.github/workflows/cloudflare-audit.yml`, and asserted in
  `test/markup-accessibility.test.mjs` and `test/project-contract.test.mjs`. Changing the
  hero/motto copy means updating ALL of them in the same commit, or CI fails and the deploy
  rolls back.
- **Hero sizing:** `.hero h1` has `max-width: 8ch` — each `.hero-word` span must fit ~8
  characters or the line wraps badly.
- **Deploy flow:** `main` is protected (PR + owner approval; the owner merges in the GitHub
  UI). Merging triggers `deploy.yml`: audit → verify → tests → build → Pages deploy →
  smoke checks → auto-rollback on failure. There is no local production deploy.
- **og.png:** regenerate via a 1200×630 headless-browser screenshot of an HTML card using
  `/fonts` (Cormorant Garamond display, Instrument Sans body) over the existing tower art.
  After og/meta changes, the owner refreshes LinkedIn's cache at linkedin.com/post-inspector
  with `https://alexnava.me/`.
- **Hosting:** Cloudflare Pages project `alexnava-me`; the apex domain is served by Worker
  `babel-apex` proxying to `alexnava-me.pages.dev`.
