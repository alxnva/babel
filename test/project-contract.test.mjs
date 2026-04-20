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
