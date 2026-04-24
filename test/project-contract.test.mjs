import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");

async function readProjectFile(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

test("repo contract reflects the current preview workflow and test suite", async () => {
  const packageJson = JSON.parse(await readProjectFile("package.json"));
  const readme = await readProjectFile("README.md");
  const agents = await readProjectFile("AGENTS.md");
  const claude = await readProjectFile("CLAUDE.md");

  assert.match(packageJson.scripts.preview, /wrangler pages dev dist/);
  assert.match(readme, /npm run preview/);
  assert.match(agents, /npm run preview/);
  assert.doesNotMatch(claude, /There is no automated test suite in this repo\./);
  assert.match(claude, /npm test/);
});

test("site source includes a committed OG image and matching social metadata", async () => {
  const indexHtml = await readProjectFile("index.html");
  const buildScript = await readProjectFile("build.mjs");
  const gitignore = await readProjectFile(".gitignore");

  await access(path.join(projectRoot, "og.png"));

  assert.match(indexHtml, /property="og:image"\s+content="https:\/\/alexnava\.me\/og\.png"/);
  assert.match(indexHtml, /name="twitter:image"\s+content="https:\/\/alexnava\.me\/og\.png"/);
  assert.match(indexHtml, /name="twitter:card"\s+content="summary_large_image"/);
  assert.match(buildScript, /"og\.png"/);
  assert.match(gitignore, /!og\.png/);
});

test("Cloudflare Pages headers preserve the static security contract", async () => {
  const headers = await readProjectFile("_headers");
  const indexHtml = await readProjectFile("index.html");

  assert.match(headers, /^\/\*\r?\n/m);
  assert.match(headers, /X-Content-Type-Options:\s*nosniff/);
  assert.match(headers, /Referrer-Policy:\s*strict-origin-when-cross-origin/);
  assert.match(headers, /X-Frame-Options:\s*DENY/);
  assert.match(headers, /Cross-Origin-Opener-Policy:\s*same-origin/);
  assert.match(headers, /Cross-Origin-Resource-Policy:\s*same-origin/);
  assert.match(
    headers,
    /Permissions-Policy:\s*camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\), usb=\(\)/,
  );
  assert.match(
    headers,
    /Content-Security-Policy:\s*default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data:; font-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'/,
  );

  const hsts = headers.match(
    /Strict-Transport-Security:\s*max-age=(\d+); includeSubDomains; preload/,
  );
  assert.ok(hsts, "HSTS must include subdomains and preload");
  assert.ok(Number(hsts[1]) >= 31_536_000, "HSTS max-age must be at least 12 months");
  assert.doesNotMatch(headers, /Access-Control-Allow-Origin:\s*\*/);
  assert.doesNotMatch(headers, /static\.cloudflareinsights\.com/);
  assert.doesNotMatch(indexHtml, /static\.cloudflareinsights\.com/);
});

test("redirect contract stays limited to known legacy paths", async () => {
  const redirects = await readProjectFile("_redirects");
  const redirectLines = redirects
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  assert.deepEqual(redirectLines, [
    "/explore / 301",
    "/tower-world / 301",
    "/tower-world.html / 301",
    "/babel_explorable_world.html / 301",
    "/explore/* / 301",
    "/prototype/* / 301",
  ]);
});
