import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");
const qualityPath = path.join(projectRoot, "src", "scene", "quality.js");

function createContext({
  search = "",
  innerWidth = 1440,
  innerHeight = 900,
  navigatorInfo = { deviceMemory: 8, hardwareConcurrency: 8 },
  matchMedia,
  canvas,
} = {}) {
  const window = {
    BabelSite: {},
    location: { search },
    innerWidth,
    innerHeight,
    navigator: navigatorInfo,
    performance: { now: () => 0 },
    matchMedia: matchMedia || (() => ({ matches: false, addEventListener() {} })),
  };
  const document = {
    createElement() {
      return (
        canvas || {
          getContext() {
            return null;
          },
        }
      );
    },
  };
  return { window, document, navigator: navigatorInfo };
}

async function loadQuality(context) {
  const source = await readFile(qualityPath, "utf8");
  vm.runInNewContext(
    source,
    {
      window: context.window,
      document: context.document,
      navigator: context.navigator,
      console,
      URLSearchParams,
    },
    { filename: qualityPath },
  );
  return context.window.BabelSite.scene;
}

test("selectSceneQualityTier resolves the full decision matrix", async () => {
  const scene = await loadQuality(createContext());
  const controls = { overrideTier: null, requestedTier: "auto", debug: false };
  const caps = { maxTextureSize: 8192, maxAnisotropy: 8 };
  const viewport = { width: 1440, height: 900 };

  assert.equal(
    scene.selectSceneQualityTier({
      controls,
      navigatorInfo: { deviceMemory: 2, hardwareConcurrency: 8 },
      viewport,
      caps,
    }),
    "low",
    "low deviceMemory drops to low",
  );
  assert.equal(
    scene.selectSceneQualityTier({
      controls,
      navigatorInfo: { deviceMemory: 8, hardwareConcurrency: 8 },
      viewport,
      caps: { maxTextureSize: 2048, maxAnisotropy: 8 },
    }),
    "low",
    "weak texture cap drops to low",
  );
  assert.equal(
    scene.selectSceneQualityTier({
      controls,
      navigatorInfo: { deviceMemory: 8, hardwareConcurrency: 8 },
      viewport,
      caps: { maxTextureSize: 8192, maxAnisotropy: 2 },
    }),
    "low",
    "weak anisotropy drops to low",
  );
  assert.equal(
    scene.selectSceneQualityTier({
      controls,
      navigatorInfo: { deviceMemory: 8, hardwareConcurrency: 4 },
      viewport,
      caps,
    }),
    "balanced",
    "low core count lands on balanced",
  );
  assert.equal(
    scene.selectSceneQualityTier({
      controls,
      navigatorInfo: { hardwareConcurrency: 8 },
      viewport,
      caps,
      touchPrimary: true,
    }),
    "balanced",
    "touch-primary devices cap at balanced",
  );
  assert.equal(
    scene.selectSceneQualityTier({
      controls,
      navigatorInfo: { hardwareConcurrency: 8 },
      viewport: { width: 320, height: 640 },
      caps,
    }),
    "balanced",
    "tiny viewport short-side caps at balanced",
  );
  assert.equal(
    scene.selectSceneQualityTier({ controls, navigatorInfo: {}, viewport, caps }),
    "high",
    "unknown navigator + desktop viewport stays high",
  );
});

test("selectSceneQualityTier honors explicit overrides over hardware hints", async () => {
  const scene = await loadQuality(createContext());
  const tier = scene.selectSceneQualityTier({
    controls: { overrideTier: "high", requestedTier: "high", debug: false },
    navigatorInfo: { deviceMemory: 1, hardwareConcurrency: 1 },
    viewport: { width: 320, height: 320 },
    caps: { maxTextureSize: 1024, maxAnisotropy: 1 },
  });
  assert.equal(tier, "high");
});

test("readSceneQualityControls parses tier query strings and debug flag", async () => {
  const scene = await loadQuality(createContext());

  const blank = scene.readSceneQualityControls("");
  assert.equal(blank.debug, false);
  assert.equal(blank.overrideTier, null);
  assert.equal(blank.requestedTier, "auto");

  const forced = scene.readSceneQualityControls("?quality=HIGH&sceneDebug=true");
  assert.equal(forced.overrideTier, "high");
  assert.equal(forced.debug, true);

  const bogus = scene.readSceneQualityControls("?quality=potato&sceneDebug=0");
  assert.equal(bogus.overrideTier, null);
  assert.equal(bogus.requestedTier, "auto");
  assert.equal(bogus.debug, false);
});

test("readWebGLQualityCaps falls back when probing fails and reports parameters when it succeeds", async () => {
  const offline = await loadQuality(createContext());
  const fallback = offline.readWebGLQualityCaps({
    canvas: {
      getContext() {
        throw new Error("nope");
      },
    },
  });
  assert.equal(fallback.maxAnisotropy, 1);
  assert.equal(fallback.maxTextureSize, 0);

  const losing = {
    loseContext() {
      losing.called = true;
    },
  };
  const aniExt = { MAX_TEXTURE_MAX_ANISOTROPY_EXT: "ANI" };
  const glMock = {
    MAX_TEXTURE_SIZE: "MTS",
    getParameter(name) {
      if (name === "MTS") return 8192;
      if (name === "ANI") return 15.5;
      return 0;
    },
    getExtension(name) {
      if (name === "EXT_texture_filter_anisotropic") return aniExt;
      if (name === "WEBGL_lose_context") return losing;
      return null;
    },
  };
  const online = await loadQuality(createContext());
  const caps = online.readWebGLQualityCaps({
    canvas: {
      getContext() {
        return glMock;
      },
    },
  });
  assert.equal(caps.maxTextureSize, 8192);
  assert.equal(caps.maxAnisotropy, 16, "anisotropy is rounded to an integer");
  assert.equal(losing.called, true, "probe context is released after measurement");
});

test("clampSceneTunerZoom rejects NaN and clamps to declared bounds", async () => {
  const scene = await loadQuality(createContext());
  const { maxZoom, minZoom, defaultZoom } = scene.getSceneTunerDefaults();

  assert.equal(scene.clampSceneTunerZoom(999), maxZoom);
  assert.equal(scene.clampSceneTunerZoom(-999), minZoom);
  assert.equal(scene.clampSceneTunerZoom(3.6), 4, "values are rounded toward the nearest integer");
  assert.equal(scene.clampSceneTunerZoom("not a number"), defaultZoom);
  assert.equal(scene.clampSceneTunerZoom(Number.NaN), defaultZoom);
  assert.equal(scene.clampSceneTunerZoom(undefined, 0), 0, "falls back to the supplied default");
});

test("applySceneTunerZoom widens portrait framing more aggressively than compact and clamps FOV", async () => {
  const scene = await loadQuality(createContext());
  const portraitBase = scene.getSceneCompositionProfile({ width: 390, height: 844, zoom: 0 });
  const compactBase = scene.getSceneCompositionProfile({ width: 900, height: 844, zoom: 0 });

  const portraitMax = scene.applySceneTunerZoom(portraitBase, 18);
  const compactMax = scene.applySceneTunerZoom(compactBase, 18);
  const portraitFloor = scene.applySceneTunerZoom(portraitBase, -12);

  assert.ok(portraitMax.camera.orbitBase - portraitBase.camera.orbitBase > compactMax.camera.orbitBase - compactBase.camera.orbitBase);
  assert.ok(portraitMax.camera.fov <= 56, "FOV is clamped at 56");
  assert.ok(portraitFloor.camera.fov >= 42, "FOV is clamped at 42");
  assert.ok(portraitMax.camera.lookAtBase >= 0);
  assert.ok(portraitMax.camera.orbitTrim >= 0.04);
  assert.equal(portraitMax.manualZoom, 18);
  assert.notEqual(portraitMax, portraitBase, "applySceneTunerZoom returns a fresh profile");
  assert.notEqual(portraitMax.camera, portraitBase.camera, "camera is cloned, not mutated");
});

test("quality governor drops to low under sustained stress and ignores invalid samples", async () => {
  const scene = await loadQuality(createContext());
  const governor = scene.createSceneQualityGovernor({ initialTier: "high" });

  for (let frame = 0; frame < 360; frame += 1) {
    governor.sample(40, frame * 40);
  }
  assert.equal(governor.getTier(), "low", "sustained >20ms frames walk the governor down two tiers");

  assert.equal(governor.sample(-1, 0), null, "negative frame times are ignored");
  assert.equal(governor.sample(Number.NaN, 0), null, "NaN frame times are ignored");
});

test("fixed-tier governor ignores samples entirely", async () => {
  const scene = await loadQuality(createContext());
  const governor = scene.createSceneQualityGovernor({ initialTier: "high", overrideTier: "low" });

  assert.equal(governor.isFixed(), true);
  assert.equal(governor.getTier(), "low");
  for (let frame = 0; frame < 600; frame += 1) {
    governor.sample(5, frame * 16);
  }
  assert.equal(governor.getTier(), "low", "a fixed tier never upgrades");
});

test("governor warmup window skips early over-budget frames before arming the streak", async () => {
  const scene = await loadQuality(createContext());
  const governor = scene.createSceneQualityGovernor({
    initialTier: "high",
    downsampleFrames: 10,
    warmupFrames: 20,
  });

  // First 30 samples (10 downsample + 20 warmup) stay in the warmup window and
  // must not count toward the downgrade streak even though every frame is slow.
  for (let frame = 0; frame < 30; frame += 1) {
    assert.equal(governor.sample(40, frame * 40), null, `warmup frame ${frame} should not trigger a tier change`);
  }
  assert.equal(governor.getTier(), "high", "tier stays pinned to initial during warmup");
});

test("detectSaveData honors Save-Data header and prefers-reduced-data media query", async () => {
  const scene = await loadQuality(createContext());

  assert.equal(scene.detectSaveData({ navigatorInfo: {} }), false);
  assert.equal(
    scene.detectSaveData({ navigatorInfo: { connection: { saveData: true } } }),
    true,
    "connection.saveData === true flips the flag",
  );

  const prefersReduced = await loadQuality(
    createContext({
      matchMedia: (query) => ({
        matches: query === "(prefers-reduced-data: reduce)",
        addEventListener() {},
      }),
    }),
  );
  assert.equal(prefersReduced.detectSaveData({ navigatorInfo: {} }), true);
});

test("selectSceneQualityTier forces low when saveData is set", async () => {
  const scene = await loadQuality(createContext());
  const tier = scene.selectSceneQualityTier({
    controls: { overrideTier: null, requestedTier: "auto", debug: false },
    navigatorInfo: { deviceMemory: 8, hardwareConcurrency: 8 },
    viewport: { width: 1440, height: 900 },
    caps: { maxTextureSize: 8192, maxAnisotropy: 8 },
    saveData: true,
  });
  assert.equal(tier, "low");
});

test("resolveEffectiveDprCap caps touch-primary devices with hidden deviceMemory", async () => {
  const scene = await loadQuality(createContext());
  const profile = { dprCap: 2 };

  assert.equal(
    scene.resolveEffectiveDprCap(profile, { touchPrimary: true, navigatorInfo: {} }),
    1.25,
    "unknown deviceMemory + touch primary is capped at 1.25",
  );
  assert.equal(
    scene.resolveEffectiveDprCap(profile, {
      touchPrimary: true,
      navigatorInfo: { deviceMemory: 8 },
    }),
    2,
    "known deviceMemory keeps the base cap",
  );
  assert.equal(
    scene.resolveEffectiveDprCap(profile, { touchPrimary: false, navigatorInfo: {} }),
    2,
    "desktop devices keep the base cap",
  );
  assert.equal(
    scene.resolveEffectiveDprCap({ dprCap: 1 }, { touchPrimary: true, navigatorInfo: {} }),
    1,
    "base cap below 1.25 wins",
  );
});

test("portraitPhone composition profile trims active particle counts", async () => {
  const scene = await loadQuality(createContext());
  const portrait = scene.getSceneCompositionProfile({ width: 390, height: 844, zoom: 0 });
  const desktop = scene.getSceneCompositionProfile({ width: 1440, height: 900, zoom: 0 });

  assert.equal(typeof portrait.countScale, "number");
  assert.ok(portrait.countScale < 1, "portrait phone trims counts below desktop");
  assert.equal(desktop.countScale, 1);
});

test("createSceneQualityState exposes profile, governor, and live sample handoff", async () => {
  const context = createContext({ search: "?quality=auto", innerWidth: 1440, innerHeight: 900 });
  const scene = await loadQuality(context);

  const state = scene.createSceneQualityState({
    navigatorInfo: { deviceMemory: 8, hardwareConcurrency: 8 },
    viewport: { width: 1440, height: 900 },
    caps: { maxTextureSize: 8192, maxAnisotropy: 8 },
    touchPrimary: false,
  });

  assert.equal(state.initialTier, "high");
  assert.equal(state.getTier(), "high");
  assert.equal(state.getProfile().dprCap, 2);

  // Warmup: first 59 frames return null regardless (streak check gated on a full sample window).
  for (let frame = 0; frame < 59; frame += 1) {
    assert.equal(state.sample(40, frame * 40), null);
  }
  // Streak builds once the window fills — 120 consecutive over-budget frames trigger one step down.
  let downgrade = null;
  for (let frame = 59; frame < 360 && !downgrade; frame += 1) {
    downgrade = state.sample(40, frame * 40);
  }
  assert.ok(downgrade, "governor returns the downgraded profile once the streak is complete");
  assert.equal(state.getTier(), "balanced");
  assert.equal(downgrade.dprCap, 1.5);
});
