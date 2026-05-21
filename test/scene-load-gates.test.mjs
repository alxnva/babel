import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");
const mainSourcePath = path.join(projectRoot, "src", "main.js");
const qualitySourcePath = path.join(projectRoot, "src", "scene", "quality.js");

function createScriptElement() {
  const listeners = new Map();
  return {
    dataset: {},
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    dispatch(type) {
      listeners.get(type)?.();
    },
  };
}

function createContext({ saveData = false, search = "", webgl = true } = {}) {
  const host = { hidden: false };
  const scripts = [];
  let webglProbeCount = 0;
  const window = {
    BabelSite: {},
    WebGLRenderingContext: function WebGLRenderingContext() {},
    location: { search },
    matchMedia(query) {
      return {
        matches: query === "(prefers-reduced-data: reduce)" ? saveData : false,
        addEventListener() {},
      };
    },
    requestIdleCallback() {},
    requestAnimationFrame() {},
  };
  const navigator = { connection: { saveData } };
  const document = {
    readyState: "loading",
    head: {
      appendChild(script) {
        scripts.push(script);
        script.dispatch("load");
      },
    },
    addEventListener() {},
    createElement(tagName) {
      if (tagName === "script") return createScriptElement();
      return {
        getContext(type) {
          if (type === "webgl" || type === "experimental-webgl") {
            webglProbeCount += 1;
            return webgl ? {} : null;
          }
          return null;
        },
      };
    },
    getElementById(id) {
      return id === "home-scene" ? host : null;
    },
    querySelector(selector) {
      if (selector === "link[data-scene-script]") return { href: "/scripts/scene.js" };
      return null;
    },
  };

  return {
    context: {
      window,
      document,
      navigator,
      console,
      URLSearchParams,
      requestAnimationFrame: window.requestAnimationFrame,
      setTimeout() {},
    },
    host,
    scripts,
    getWebglProbeCount: () => webglProbeCount,
  };
}

async function loadMainWithQuality(context) {
  const qualitySource = await readFile(qualitySourcePath, "utf8");
  const mainSource = await readFile(mainSourcePath, "utf8");
  vm.runInNewContext(qualitySource, context, { filename: qualitySourcePath });
  vm.runInNewContext(mainSource, context, { filename: mainSourcePath });
}

test("scene loader skips the deferred bundle when reduced-data is requested", async () => {
  const { context, host, scripts, getWebglProbeCount } = createContext({ saveData: true });
  await loadMainWithQuality(context);

  const loaded = await context.window.BabelSite.ensureSceneReady();

  assert.equal(loaded, false);
  assert.equal(host.hidden, true);
  assert.equal(scripts.length, 0);
  assert.equal(getWebglProbeCount(), 0, "reduced-data exits before probing WebGL");
});

test("explicit quality override still allows the scene bundle on reduced-data connections", async () => {
  const { context, host, scripts, getWebglProbeCount } = createContext({
    saveData: true,
    search: "?quality=low",
  });
  await loadMainWithQuality(context);

  const loaded = await context.window.BabelSite.ensureSceneReady();

  assert.equal(loaded, true);
  assert.equal(host.hidden, false);
  assert.equal(scripts.length, 1);
  assert.equal(getWebglProbeCount(), 1);
});

test("invalid quality override does not bypass the data-saver gate", async () => {
  const { context, host, scripts, getWebglProbeCount } = createContext({
    saveData: true,
    search: "?quality=potato",
  });
  await loadMainWithQuality(context);

  const loaded = await context.window.BabelSite.ensureSceneReady();

  assert.equal(loaded, false);
  assert.equal(host.hidden, true);
  assert.equal(scripts.length, 0);
  assert.equal(getWebglProbeCount(), 0, "malformed override must not bypass data-saver");
});
