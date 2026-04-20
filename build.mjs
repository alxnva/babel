import { build, context } from "esbuild";
import { copyFile, cp, mkdir, rm, writeFile } from "node:fs/promises";
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

const STATIC_FILES = [
  "LICENSE",
  "index.html",
  "404.html",
  "styles.css",
  "favicon.svg",
  "_headers",
  "_redirects",
];

const STATIC_DIRS = ["fonts"];
const DIST_DIR = join(__dirname, "dist");
const DIST_SCRIPTS_DIR = join(DIST_DIR, "scripts");
const APP_BUNDLE = join(DIST_SCRIPTS_DIR, "app.js");
const THREE_VENDOR_SOURCE = join(__dirname, "node_modules", "three", "build", "three.min.js");
const THREE_VENDOR_DEST = join(DIST_DIR, "vendor", "three.min.js");

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

async function buildAppBundle({ write = true } = {}) {
  const results = await Promise.all(
    ENTRIES.map((entry) => build(entryOptions(entry))),
  );
  const chunks = results.map((res, ix) => {
    const out = res.outputFiles?.[0];
    if (!out) throw new Error(`esbuild produced no output for ${ENTRIES[ix]}`);
    return out.text;
  });
  // Concatenated IIFEs with a newline between so minifier-free joins stay safe.
  const bundled = chunks.join("\n");
  if (write) {
    await mkdir(DIST_SCRIPTS_DIR, { recursive: true });
    await writeFile(APP_BUNDLE, bundled);
    const sizeKb = (Buffer.byteLength(bundled) / 1024).toFixed(1);
    console.log(`bundled ${ENTRIES.length} entries -> dist/scripts/app.js (${sizeKb} kB)`);
  }
  return bundled;
}

async function copyStaticAssets() {
  await mkdir(DIST_DIR, { recursive: true });

  await Promise.all(
    STATIC_FILES.map((file) =>
      copyFile(join(__dirname, file), join(DIST_DIR, file)),
    ),
  );

  await Promise.all(
    STATIC_DIRS.map((dir) =>
      cp(join(__dirname, dir), join(DIST_DIR, dir), { recursive: true }),
    ),
  );

  await mkdir(join(DIST_DIR, "vendor"), { recursive: true });
  await copyFile(THREE_VENDOR_SOURCE, THREE_VENDOR_DEST);
}

async function buildDist() {
  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(DIST_SCRIPTS_DIR, { recursive: true });
  await buildAppBundle();
  await copyStaticAssets();
}

if (watch) {
  await buildDist();
  const contexts = await Promise.all(
    ENTRIES.map((entry) =>
      context({ ...entryOptions(entry), write: false }),
    ),
  );
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log("watching src/ (rerun build:dist after static asset changes)");
} else if (check) {
  await buildAppBundle({ write: false });
  console.log(`verified ${ENTRIES.length} entry points`);
} else if (dist) {
  await buildDist();
  console.log("built deployable dist/");
} else {
  await buildDist();
  console.log("built deployable dist/");
}
