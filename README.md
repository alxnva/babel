# babel

Source for [alexnava.me](https://alexnava.me/), a static portfolio site built with plain HTML, CSS, vanilla JavaScript, and a small Three.js scene.

## Stack

- Plain HTML, CSS, and vanilla JavaScript
- Three.js r128 pulled from `three` during the build and emitted into `dist/vendor/`
- Inter + Cormorant Garamond woff2 subsets, self-hosted under `fonts/`
- Minimal esbuild step: edit readable source in `src/`, generate deploy output into `dist/`
- Cloudflare Pages Direct Upload for production hosting

## Local development

```powershell
npm install
npm run build:dist
cd dist
python -m http.server 4173
```

Then open [http://127.0.0.1:4173/](http://127.0.0.1:4173/).

The source repository does not track generated JS bundles. `dist/` is the only generated publish payload.

## Build commands

```powershell
npm run build       # build dist/ from source
npm run build:dist  # same as build; explicit deploy-oriented entrypoint
npm run verify      # compile-check all JS entry points without writing files
npm run watch       # watch src/ and rebuild dist/scripts
npm run format      # prettier-format src/, *.html, *.css, *.md
```

When bumping visible assets, bump the `?v=NNN` query strings in `index.html` and `404.html` together so cached HTML revalidates styles and scripts in lockstep.

## Repository layout

| Path                      | Purpose                                                  |
| ------------------------- | -------------------------------------------------------- |
| `index.html`              | Homepage markup and panel structure                      |
| `styles.css`              | Site-wide styles, `@font-face`, tokens, responsive rules |
| `src/`                    | Authoritative JavaScript source                          |
| `dist/`                   | Generated publish directory for Cloudflare Pages         |
| `fonts/*.woff2`           | Self-hosted font subsets                                 |
| `404.html`                | Not-found page                                           |
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

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
