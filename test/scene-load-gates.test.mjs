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
const webglProbePath = path.join(projectRoot, "src", "shared", "webgl-probe.js");

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

function createMutableChangeTarget(initialMatches = false) {
  let matches = Boolean(initialMatches);
  const listeners = new Set();
  return {
    get matches() {
      return matches;
    },
    addEventListener(type, handler) {
      if (type === "change") listeners.add(handler);
    },
    removeEventListener(type, handler) {
      if (type === "change") listeners.delete(handler);
    },
    addListener(handler) {
      listeners.add(handler);
    },
    removeListener(handler) {
      listeners.delete(handler);
    },
    setMatches(value) {
      matches = Boolean(value);
      for (const handler of [...listeners]) handler({ matches });
    },
  };
}

function createContext({
  height = 720,
  reducedMotion = false,
  saveData = false,
  sceneUrl = "/scripts/scene.js",
  search = "",
  softwareRenderer = "",
  webgl = true,
  width = 1280,
} = {}) {
  const host = { hidden: false };
  const scripts = [];
  const domContentLoadedListeners = new Set();
  const idleCallbacks = [];
  const motionQuery = createMutableChangeTarget(reducedMotion);
  const dataQuery = createMutableChangeTarget(saveData);
  const connectionListeners = new Set();
  const connection = {
    saveData,
    addEventListener(type, handler) {
      if (type === "change") connectionListeners.add(handler);
    },
    removeEventListener(type, handler) {
      if (type === "change") connectionListeners.delete(handler);
    },
    setSaveData(value) {
      this.saveData = Boolean(value);
      for (const handler of [...connectionListeners]) handler({ type: "change" });
    },
  };
  let contextLossCount = 0;
  let webglProbeCount = 0;
  const window = {
    BabelSite: {},
    WebGLRenderingContext: function WebGLRenderingContext() {},
    innerHeight: height,
    innerWidth: width,
    location: { search },
    matchMedia(query) {
      if (query === "(prefers-reduced-data: reduce)") return dataQuery;
      if (query === "(prefers-reduced-motion: reduce)") return motionQuery;
      return createMutableChangeTarget(false);
    },
    requestIdleCallback(callback) {
      idleCallbacks.push(callback);
    },
    requestAnimationFrame() {},
  };
  const navigator = { connection };
  const document = {
    readyState: "loading",
    head: {
      appendChild(script) {
        scripts.push(script);
        window.BabelSite.scene.initHomeScene = () => true;
        script.dispatch("load");
      },
    },
    addEventListener(type, handler) {
      if (type === "DOMContentLoaded") domContentLoadedListeners.add(handler);
    },
    createElement(tagName) {
      if (tagName === "script") return createScriptElement();
      return {
        getContext(type) {
          if (type === "webgl" || type === "experimental-webgl") {
            webglProbeCount += 1;
            if (!webgl) return null;
            return {
              RENDERER: 0x1f01,
              getExtension(name) {
                if (name === "WEBGL_debug_renderer_info") {
                  return { UNMASKED_RENDERER_WEBGL: 0x9246 };
                }
                if (name === "WEBGL_lose_context") {
                  return {
                    loseContext() {
                      contextLossCount += 1;
                    },
                  };
                }
                return null;
              },
              getParameter(parameter) {
                if (parameter === 0x9246 || parameter === 0x1f01) {
                  return softwareRenderer || "ANGLE (NVIDIA GeForce)";
                }
                return null;
              },
            };
          }
          return null;
        },
      };
    },
    getElementById(id) {
      return id === "home-scene" ? host : null;
    },
    querySelector(selector) {
      if (selector === "meta[data-scene-script]") {
        return {
          getAttribute(name) {
            return name === "content" ? sceneUrl : null;
          },
        };
      }
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
    connection,
    dataQuery,
    dispatchDOMContentLoaded() {
      for (const handler of [...domContentLoadedListeners]) handler({ type: "DOMContentLoaded" });
      domContentLoadedListeners.clear();
    },
    async flushIdleCallbacks() {
      await Promise.all(idleCallbacks.splice(0).map((callback) => callback()));
    },
    motionQuery,
    scripts,
    getContextLossCount: () => contextLossCount,
    getWebglProbeCount: () => webglProbeCount,
  };
}

async function loadMainWithQuality(context) {
  const probeSource = await readFile(webglProbePath, "utf8");
  const qualitySource = await readFile(qualitySourcePath, "utf8");
  const mainSource = await readFile(mainSourcePath, "utf8");
  vm.runInNewContext(probeSource, context, { filename: webglProbePath });
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

test("scene loader keeps the poster static when reduced motion is requested", async () => {
  const { context, host, scripts, getWebglProbeCount } = createContext({
    reducedMotion: true,
  });
  await loadMainWithQuality(context);

  const loaded = await context.window.BabelSite.ensureSceneReady();

  assert.equal(loaded, false);
  assert.equal(host.hidden, true);
  assert.equal(scripts.length, 0);
  assert.equal(getWebglProbeCount(), 0, "reduced motion exits before probing WebGL");
});

test("clearing an initial static preference loads and reveals the scene exactly once", async () => {
  const harness = createContext({ reducedMotion: true });
  await loadMainWithQuality(harness.context);

  harness.dispatchDOMContentLoaded();
  await harness.flushIdleCallbacks();

  assert.equal(harness.host.hidden, true);
  assert.equal(harness.scripts.length, 0);

  harness.motionQuery.setMatches(false);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(harness.host.hidden, false);
  assert.equal(harness.scripts.length, 1);

  harness.motionQuery.setMatches(true);
  harness.motionQuery.setMatches(false);
  await Promise.resolve();

  assert.equal(harness.scripts.length, 1, "preference changes after recovery do not reload");
});

test("scene loader keeps the poster for software-rendered WebGL and releases the probe", async () => {
  for (const renderer of [
    "Google SwiftShader",
    "llvmpipe (LLVM 18.1)",
    "ANGLE Software Rasterizer",
    "Microsoft Basic Render Driver",
  ]) {
    const { context, host, scripts, getContextLossCount, getWebglProbeCount } = createContext({
      softwareRenderer: renderer,
    });
    await loadMainWithQuality(context);

    const loaded = await context.window.BabelSite.ensureSceneReady();

    assert.equal(loaded, false, renderer);
    assert.equal(host.hidden, true);
    assert.equal(scripts.length, 0);
    assert.equal(getWebglProbeCount(), 1);
    assert.equal(getContextLossCount(), 1);

    assert.equal(await context.window.BabelSite.ensureSceneReady(), false);
    assert.equal(getWebglProbeCount(), 1, "software capability result is cached");
    assert.equal(getContextLossCount(), 1, "the cached probe does not create another context");
  }
});

test("capable phone-shaped viewports retain the live scene path", async () => {
  const { context, host, scripts } = createContext({ height: 844, width: 390 });
  await loadMainWithQuality(context);

  const loaded = await context.window.BabelSite.ensureSceneReady();

  assert.equal(loaded, true);
  assert.equal(host.hidden, false);
  assert.equal(scripts.length, 1);
});

test("explicit quality and debug controls force live software WebGL unless WebGL is unavailable", async () => {
  for (const search of ["?quality=low", "?sceneDebug=1"]) {
    const { context, host, scripts } = createContext({
      reducedMotion: true,
      saveData: true,
      search,
      softwareRenderer: "Microsoft Basic Render Driver",
    });
    await loadMainWithQuality(context);

    const loaded = await context.window.BabelSite.ensureSceneReady();

    assert.equal(loaded, true, `${search} should force the live scene`);
    assert.equal(host.hidden, false);
    assert.equal(scripts.length, 1);
  }

  const unavailable = createContext({ search: "?quality=high", webgl: false });
  await loadMainWithQuality(unavailable.context);
  assert.equal(await unavailable.context.window.BabelSite.ensureSceneReady(), false);
  assert.equal(unavailable.scripts.length, 0);
});

test("scene loader reads the inert metadata content as the deferred bundle URL", async () => {
  const { context, scripts } = createContext({
    sceneUrl: "/scripts/scene.content-hash.js",
  });
  await loadMainWithQuality(context);

  const loaded = await context.window.BabelSite.ensureSceneReady();

  assert.equal(loaded, true);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, "/scripts/scene.content-hash.js");
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

test("scene gate has no user-agent, Lighthouse, or phone-viewport escape hatch", async () => {
  const source = await readFile(mainSourcePath, "utf8");

  assert.doesNotMatch(source, /userAgent|Lighthouse|Chrome-Lighthouse/i);
  assert.doesNotMatch(source, /shortSide|longSide|phoneViewport/);
});
