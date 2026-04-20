import { build, context } from "esbuild";
import { copyFile, cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Single entry point. src/app.js imports each module in dependency order; each
// module attaches to window.BabelSite as a side effect. esbuild bundles the
// whole graph (including tree-shaken three.js) into one IIFE.
const APP_ENTRY = "src/app.js";

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

if ((watch && check) || (watch && dist) || (check && dist)) {
  throw new Error("Use only one of --watch, --check, or --dist.");
}

const appBuildOptions = () => ({
  entryPoints: [join(__dirname, APP_ENTRY)],
  bundle: true,
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
  const result = await build(appBuildOptions());
  const out = result.outputFiles?.[0];
  if (!out) throw new Error(`esbuild produced no output for ${APP_ENTRY}`);
  return out.text;
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

  const bundled = await buildAppBundle();
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
  console.log(`bundled ${APP_ENTRY} -> scripts/${appHashedName} (${appKb} kB)`);
  console.log(`hashed assets: css/${cssHashedName}`);
}

if (watch) {
  await buildDist();
  const ctx = await context(appBuildOptions());
  await ctx.watch();
  console.log("watching src/ (rerun build:dist after static asset changes)");
} else if (check) {
  await buildAppBundle();
  console.log(`verified ${APP_ENTRY}`);
} else {
  await buildDist();
  console.log("built deployable dist/");
}
