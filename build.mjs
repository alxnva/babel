import { build, context } from "esbuild";
import { copyFile, cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Order matters: each IIFE attaches to window.BabelSite and may read from
// entries that ran before it. main.js must run last (it reads ui + scene).
const ENTRIES = [
  "scene/helpers.js",
  "scene/palette.js",
  "scene/world.js",
  "scene/quality.js",
  "scene/visibility.js",
  "scene/textures.js",
  "scene/index.js",
  "ui/hero.js",
  "ui/icons.js",
  "ui/panels.js",
  "ui/scene-tuner.js",
  "main.js",
];

const args = new Set(process.argv.slice(2));
const watch = args.has("--watch");
const check = args.has("--check");
const dist = args.has("--dist");

// Files copied verbatim (no URL rewriting).
const STATIC_FILES = [
  "LICENSE",
  "favicon.svg",
  "icon.svg",
  "icon-maskable.svg",
  "manifest.webmanifest",
  "og.png",
  "_headers",
  "_redirects",
];
const STATIC_DIRS = ["fonts"];
const DIST_DIR = join(__dirname, "dist");
const DIST_SCRIPTS_DIR = join(DIST_DIR, "scripts");
const DIST_CSS_DIR = join(DIST_DIR, "css");
const DIST_VENDOR_DIR = join(DIST_DIR, "vendor");
const THREE_VENDOR_SOURCE = join(__dirname, "node_modules", "three", "build", "three.min.js");

// Literal placeholder in bundled app.js; rewritten to the hashed vendor path at build time.
const THREE_PLACEHOLDER = "/vendor/three.min.js";

if ((watch && check) || (watch && dist) || (check && dist)) {
  throw new Error("Use only one of --watch, --check, or --dist.");
}

const entryOptions = (entry) => ({
  entryPoints: [join(__dirname, "src", entry)],
  bundle: false,
  minify: true,
  target: "es2022",
  format: "iife",
  legalComments: "none",
  write: false,
});

function sha8(buf) {
  return createHash("sha256").update(buf).digest("hex").slice(0, 8);
}

async function buildAppBundle() {
  const results = await Promise.all(ENTRIES.map((entry) => build(entryOptions(entry))));
  const chunks = results.map((res, ix) => {
    const out = res.outputFiles?.[0];
    if (!out) throw new Error(`esbuild produced no output for ${ENTRIES[ix]}`);
    return out.text;
  });
  // Concatenated IIFEs with a newline between so minifier-free joins stay safe.
  return chunks.join("\n");
}

function rewriteHtml(src, { appPath, cssPath }) {
  // Match styles.css and scripts/app.js refs with or without a ?v=NNN query,
  // so stale query strings in source can't drift away from the real hashed path.
  return src
    .replace(/\/styles\.css(\?v=\d+)?/g, cssPath)
    .replace(/\/scripts\/app\.js(\?v=\d+)?/g, appPath);
}

async function clearDist() {
  // Empty dist/ contents without removing the dir itself — a live preview
  // server (python http.server) can hold the dir handle open on Windows.
  await mkdir(DIST_DIR, { recursive: true });
  const entries = await readdir(DIST_DIR);
  await Promise.all(
    entries.map((entry) => rm(join(DIST_DIR, entry), { recursive: true, force: true })),
  );
}

async function buildDist() {
  await clearDist();
  await mkdir(DIST_SCRIPTS_DIR, { recursive: true });
  await mkdir(DIST_CSS_DIR, { recursive: true });
  await mkdir(DIST_VENDOR_DIR, { recursive: true });

  const threeSrc = await readFile(THREE_VENDOR_SOURCE);
  const threeHash = sha8(threeSrc);
  const threeHashedName = `three.min.${threeHash}.js`;
  const threeHashedUrl = `/vendor/${threeHashedName}`;
  await writeFile(join(DIST_VENDOR_DIR, threeHashedName), threeSrc);

  let bundled = await buildAppBundle();
  bundled = bundled.split(THREE_PLACEHOLDER).join(threeHashedUrl);
  const appHash = sha8(bundled);
  const appHashedName = `app.${appHash}.js`;
  const appHashedUrl = `/scripts/${appHashedName}`;
  await writeFile(join(DIST_SCRIPTS_DIR, appHashedName), bundled);

  const cssSrc = await readFile(join(__dirname, "styles.css"));
  const cssHash = sha8(cssSrc);
  const cssHashedName = `styles.${cssHash}.css`;
  const cssHashedUrl = `/css/${cssHashedName}`;
  await writeFile(join(DIST_CSS_DIR, cssHashedName), cssSrc);

  await Promise.all(
    STATIC_FILES.map((file) => copyFile(join(__dirname, file), join(DIST_DIR, file))),
  );
  await Promise.all(
    STATIC_DIRS.map((dir) => cp(join(__dirname, dir), join(DIST_DIR, dir), { recursive: true })),
  );

  for (const name of ["index.html", "404.html"]) {
    const htmlSrc = await readFile(join(__dirname, name), "utf8");
    const rewritten = rewriteHtml(htmlSrc, { appPath: appHashedUrl, cssPath: cssHashedUrl });
    await writeFile(join(DIST_DIR, name), rewritten);
  }

  const appKb = (Buffer.byteLength(bundled) / 1024).toFixed(1);
  console.log(`bundled ${ENTRIES.length} entries -> scripts/${appHashedName} (${appKb} kB)`);
  console.log(`hashed assets: css/${cssHashedName}, vendor/${threeHashedName}`);
}

if (watch) {
  await buildDist();
  const contexts = await Promise.all(
    ENTRIES.map((entry) => context({ ...entryOptions(entry), write: false })),
  );
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log("watching src/ (rerun build:dist after static asset changes)");
} else if (check) {
  await buildAppBundle();
  console.log(`verified ${ENTRIES.length} entry points`);
} else {
  await buildDist();
  console.log("built deployable dist/");
}
