import { build, context } from "esbuild";
import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ENTRIES = [
  "main.js",
  "scene/helpers.js",
  "scene/palette.js",
  "scene/textures.js",
  "scene/index.js",
  "ui/hero.js",
  "ui/icons.js",
  "ui/panels.js",
];

const args = new Set(process.argv.slice(2));
const watch = args.has("--watch");
const check = args.has("--check");
const dist = args.has("--dist");

const STATIC_FILES = [
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
const THREE_VENDOR_SOURCE = join(__dirname, "node_modules", "three", "build", "three.min.js");
const THREE_VENDOR_DEST = join(DIST_DIR, "vendor", "three.min.js");

if ((watch && check) || (watch && dist) || (check && dist)) {
  throw new Error("Use only one of --watch, --check, or --dist.");
}

const baseOptions = (entry, outRoot = DIST_SCRIPTS_DIR) => ({
  entryPoints: [join(__dirname, "src", entry)],
  outfile: join(outRoot, entry),
  bundle: false,
  minify: true,
  target: "es2019",
  format: "iife",
  legalComments: "none",
  logLevel: "info",
});

async function buildAllEntries(outRoot = DIST_SCRIPTS_DIR, write = true) {
  await Promise.all(
    ENTRIES.map((entry) =>
      build({
        ...baseOptions(entry, outRoot),
        logLevel: write ? "info" : "silent",
        write,
      }),
    ),
  );
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
  await buildAllEntries();
  await copyStaticAssets();
}

if (watch) {
  await buildDist();
  const contexts = await Promise.all(
    ENTRIES.map((entry) => context(baseOptions(entry))),
  );
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log("watching src/ -> dist/scripts/ (rerun build:dist after static asset changes)");
} else if (check) {
  await buildAllEntries(DIST_SCRIPTS_DIR, false);
  console.log(`verified ${ENTRIES.length} entry points`);
} else if (dist) {
  await buildDist();
  console.log("built deployable dist/");
} else {
  await buildDist();
  console.log("built deployable dist/");
}
