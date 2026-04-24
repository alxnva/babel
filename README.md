# babel

Source for [alexnava.me](https://alexnava.me/), a static portfolio site built with plain HTML, CSS, vanilla JavaScript, and a small Three.js scene.

## Stack

- Plain HTML, CSS, and vanilla JavaScript
- Three.js r160 imported from `three`, bundled into `dist/scripts/`, and tree-shaken by esbuild
- Instrument Sans + Cormorant Garamond woff2 subsets, self-hosted under `fonts/`
- Minimal esbuild step: edit readable source in `src/`, generate deploy output into `dist/`
- Lightweight `node:test` coverage for scene/runtime/UI verification under `test/`
- Cloudflare Pages Direct Upload for production hosting

## Local development

```powershell
npm install
npm run preview
```

Then open [http://127.0.0.1:4173/](http://127.0.0.1:4173/). This uses `wrangler pages dev` so local preview stays closer to the Cloudflare Pages shape than a bare static file server.

The source repository does not track generated JS bundles. `dist/` is the only generated publish payload.

## Build commands

```powershell
npm run build       # build dist/ from source
npm run build:dist  # same as build; explicit deploy-oriented entrypoint
npm run preview     # build dist/ and serve it through Wrangler Pages locally
npm run verify      # compile-check all JS entry points without writing files
npm test            # run the node:test suite in test/
npm run watch       # watch src/ and rebuild dist/scripts
npm run format      # prettier-format src/, *.html, *.css, *.md
```

Asset filenames in `dist/` are content-hashed by `build.mjs` (e.g. `scripts/app.HASH.js`, `css/styles.HASH.css`); Three.js is bundled into the app script, so rerun `npm run build:dist` after changes — the hash moves automatically and cached HTML revalidates against the new path.

CI and production deploys follow the same gate order: `npm run verify`, `npm test`, then `npm run build:dist`.

## Security baseline

`_headers` is the tracked source of truth for Cloudflare Pages response headers. It keeps the site on a self-only CSP, blocks framing with both `frame-ancestors 'none'` and `X-Frame-Options: DENY`, sends `nosniff`, restrictive permissions, COOP/CORP, and preload-capable HSTS.

Cloudflare Web Analytics/RUM injection is disabled by design. Do not widen `script-src` for `static.cloudflareinsights.com` unless the privacy/CSP tradeoff is intentionally reopened.

Hostname routing and zone controls live in Cloudflare, not in this repo: keep `alexnava.me` active on Pages project `alexnava-me`, redirect `www.alexnava.me` to the apex, and either redirect production `*.pages.dev` traffic to the apex or keep it non-indexable/access-controlled. Re-confirm the Cloudflare project, DNS, certificate, WAF, and CAA state before any deploy or DNS/security setting change.

## Repository layout

| Path                      | Purpose                                                  |
| ------------------------- | -------------------------------------------------------- |
| `index.html`              | Homepage markup and panel structure                      |
| `styles.css`              | Site-wide styles, `@font-face`, tokens, responsive rules |
| `src/`                    | Authoritative JavaScript source                          |
| `dist/`                   | Generated publish directory for Cloudflare Pages         |
| `fonts/*.woff2`           | Self-hosted font subsets                                 |
| `404.html`                | Not-found page                                           |
| `og.png`                  | Social share image for Open Graph and Twitter cards      |
| `_headers` / `_redirects` | Static hosting config kept with the site                 |
| `build.mjs`               | esbuild + asset assembly script                          |
| `package.json`            | Build, deploy, and formatting scripts                    |

## Reporting issues and discussing changes

- Use [GitHub Issues](https://github.com/alxnva/babel/issues) for bug reports, questions, and feature ideas.
- See [CONTRIBUTING.md](CONTRIBUTING.md) for the change flow and pull request expectations.
- See [SECURITY.md](SECURITY.md) for private vulnerability reporting guidance.

## Deployment

- Direct Upload deploys target Cloudflare Pages project `alexnava-me`.
- Deploy commands require Wrangler authentication. Use `wrangler login`, or provide `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in environments such as CI.
- Use `npm run deploy:preview` to publish `dist/` to the Pages preview alias.
- Use `npm run deploy:prod` to publish `dist/` to the Pages production hostname.
- Cloudflare Pages should publish `dist/`, not the repo root.
- The build copies `LICENSE` into `dist/` so released assets ship with the project license text.
- GitHub Actions can deploy production builds from `main` when `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets are configured.

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
