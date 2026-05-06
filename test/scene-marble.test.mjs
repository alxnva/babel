import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");
const palettePath = path.join(projectRoot, "src", "scene", "palette.js");

async function loadPalette() {
  const window = { BabelSite: {} };
  const source = await readFile(palettePath, "utf8");
  vm.runInNewContext(source, { window, console }, { filename: palettePath });
  return window.BabelSite.scene.MARBLE_PALETTE;
}

test("MARBLE_PALETTE is frozen and exposes the documented tokens", async () => {
  const palette = await loadPalette();
  const expected = {
    marbleBase: "#d8d2cc",
    marbleVein: "#6f7886",
    marbleHighlight: "#efeae3",
    marbleShadow: "#9ea4ab",
  };

  assert.ok(Object.isFrozen(palette));
  assert.deepEqual(Object.keys(palette), Object.keys(expected));
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(palette[key], value);
    assert.equal(palette[key].length, 7);
    assert.equal(palette[key].startsWith("#"), true);
  }
});

test("MARBLE_PALETTE colors are parseable as CSS colors", async () => {
  const palette = await loadPalette();
  const hexRegex = /^#[0-9a-fA-F]{6}$/;

  for (const value of Object.values(palette)) {
    assert.match(value, hexRegex);
  }
});
