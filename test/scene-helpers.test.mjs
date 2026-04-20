import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");
const helpersPath = path.join(projectRoot, "src", "scene", "helpers.js");

async function loadHelpers({ webgl = "ok" } = {}) {
  const window = { BabelSite: {} };
  if (webgl !== "no-window-constructor") {
    window.WebGLRenderingContext = function WebGLRenderingContext() {};
  }
  const document = {
    createElement() {
      return {
        getContext(kind) {
          if (webgl === "throws") {
            throw new Error("boom");
          }
          if (webgl === "ok") return { kind };
          if (webgl === "experimental-only") {
            return kind === "experimental-webgl" ? { kind } : null;
          }
          return null;
        },
      };
    },
  };
  const source = await readFile(helpersPath, "utf8");
  vm.runInNewContext(source, { window, document, console }, { filename: helpersPath });
  return window.BabelSite.scene;
}

test("clamp01 clamps below zero, above one, and preserves interior values", async () => {
  const scene = await loadHelpers();
  assert.equal(scene.clamp01(-0.3), 0);
  assert.equal(scene.clamp01(0), 0);
  assert.equal(scene.clamp01(0.42), 0.42);
  assert.equal(scene.clamp01(1), 1);
  assert.equal(scene.clamp01(2.7), 1);
});

test("wrap01 folds negatives and values past one into the unit interval", async () => {
  const scene = await loadHelpers();
  assert.equal(scene.wrap01(0), 0);
  assert.equal(scene.wrap01(0.25), 0.25);
  assert.equal(scene.wrap01(1), 0);
  assert.equal(scene.wrap01(1.25), 0.25);
  assert.ok(Math.abs(scene.wrap01(-0.25) - 0.75) < 1e-12);
  assert.ok(Math.abs(scene.wrap01(-2.1) - 0.9) < 1e-12);
});

test("wrappedDistance is symmetric and never exceeds half the unit interval", async () => {
  const scene = await loadHelpers();
  assert.equal(scene.wrappedDistance(0.1, 0.4), scene.wrappedDistance(0.4, 0.1));
  assert.ok(Math.abs(scene.wrappedDistance(0.05, 0.95) - 0.1) < 1e-12);
  assert.ok(Math.abs(scene.wrappedDistance(0.2, 0.7) - 0.5) < 1e-12);
  for (const [a, b] of [[0, 0], [0.1, 0.3], [0.05, 0.95], [0.2, 0.7]]) {
    assert.ok(scene.wrappedDistance(a, b) <= 0.5 + 1e-12);
  }
});

test("smoothstep01 is clamped, monotonic, and passes the Hermite fixed points", async () => {
  const scene = await loadHelpers();
  assert.equal(scene.smoothstep01(-1), 0);
  assert.equal(scene.smoothstep01(0), 0);
  assert.equal(scene.smoothstep01(0.5), 0.5);
  assert.equal(scene.smoothstep01(1), 1);
  assert.equal(scene.smoothstep01(2), 1);

  let previous = scene.smoothstep01(0);
  for (let i = 1; i <= 20; i += 1) {
    const next = scene.smoothstep01(i / 20);
    assert.ok(next >= previous - 1e-12, `smoothstep01 not monotonic at ${i}`);
    previous = next;
  }
});

test("groundHeight is deterministic and stays inside its analytic bound", async () => {
  const scene = await loadHelpers();
  const limit = 1.8 + 1.35 + 0.9 + 0.55;
  const probes = [
    [0, 0],
    [12, -7],
    [-40, 22],
    [88, 88],
    [-88, -88],
  ];
  for (const [x, y] of probes) {
    const a = scene.groundHeight(x, y);
    const b = scene.groundHeight(x, y);
    assert.equal(a, b);
    assert.ok(Math.abs(a) <= limit + 1e-12, `groundHeight(${x}, ${y}) = ${a} exceeded ${limit}`);
  }
  assert.notEqual(scene.groundHeight(0, 0), scene.groundHeight(5, 0));
});

test("supportsWebGL detects standard, experimental-only, and missing contexts", async () => {
  const ok = await loadHelpers({ webgl: "ok" });
  assert.equal(ok.supportsWebGL(), true);

  const experimentalOnly = await loadHelpers({ webgl: "experimental-only" });
  assert.equal(experimentalOnly.supportsWebGL(), true);

  const missing = await loadHelpers({ webgl: "no-window-constructor" });
  assert.equal(missing.supportsWebGL(), false);

  const throws = await loadHelpers({ webgl: "throws" });
  assert.equal(throws.supportsWebGL(), false);
});
