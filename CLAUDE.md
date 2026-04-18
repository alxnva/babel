# CLAUDE.md

Read these files before starting a task:

1. `AGENTS.md`
2. `STYLE.md`
3. `PLANS.md`
4. `README.md`

## Project

Static portfolio site for `alexnava.me`. JS source lives in `src/`; generated publish output lives in `dist/` and is gitignored. npm is used only for local build/format/deploy tooling. There is no automated test suite in this repo.

## Key files

- `index.html` — homepage markup
- `styles.css` — styling and design tokens
- `src/scene/` — readable Three.js scene helpers, textures, palette, and scene bootstrap
- `src/ui/` — readable hero motion, icons, and panels
- `src/main.js` — ordered classic-script boot source
- `build.mjs` — esbuild + asset assembly (source → `dist/`)
- `package.json` — build, verify, watch, deploy, format commands
- `_headers` / `_redirects` — hosting config copied into `dist/` at build time
- `wrangler.jsonc` — Cloudflare Pages project binding

## Commands

- Install: `npm install`
- Build to `dist/`: `npm run build`
- Verify source entry points: `npm run verify`
- Watch: `npm run watch`
- Local preview: `npm run build:dist && cd dist && python -m http.server 4173`
- Format: `npm run format`

## Rules

- Plan before editing when the task is multi-file or architectural
- Read `STYLE.md` before visual changes
- Keep diffs small and reversible
- Edit JS in `src/`; never hand-edit `dist/`
- Respect `prefers-reduced-motion` and `prefers-reduced-transparency`
- Don't install dependencies, push, deploy, or alter cloud settings without explicit approval
- Treat deployment details in repo docs as notes to confirm before shipping changes
