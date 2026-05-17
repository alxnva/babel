(() => {
  const site = (window.BabelSite = window.BabelSite || {});
  let sceneInitialized = false;

  function initUi() {
    const ui = site.ui || {};
    if (typeof ui.initHeroChrome === "function") ui.initHeroChrome();
    if (typeof ui.initPanels === "function") ui.initPanels();
    if (typeof ui.initBottomNavIcons === "function") ui.initBottomNavIcons();
  }

  function initScene() {
    if (sceneInitialized) return;
    const scene = site.scene || {};
    if (typeof scene.initHomeScene === "function") {
      scene.initHomeScene();
      sceneInitialized = true;
    }
  }

  function getSceneScriptUrl() {
    const link = document.querySelector("link[data-scene-script]");
    return link?.href || "/scripts/scene.js";
  }

  // Mirrors src/scene/helpers.js#supportsWebGL so the pre-download gate and the
  // post-load check agree. Defined separately because the helper only exists
  // after scene.HASH.js loads, and we want to skip that download on browsers
  // without WebGL.
  function hasWebGL() {
    try {
      const probe = document.createElement("canvas");
      return !(
        !window.WebGLRenderingContext ||
        (!probe.getContext("webgl") && !probe.getContext("experimental-webgl"))
      );
    } catch {
      return false;
    }
  }

  function disableSceneHost() {
    const host = document.getElementById("home-scene");
    if (host) host.hidden = true;
  }

  function readSceneQualityControls() {
    const scene = site.scene || {};
    if (typeof scene.readSceneQualityControls === "function") {
      return scene.readSceneQualityControls(window.location?.search || "");
    }

    try {
      const params = new URLSearchParams(window.location?.search || "");
      const quality = params.get("quality");
      return { overrideTier: quality && quality.toLowerCase() !== "auto" ? quality : null };
    } catch {
      return { overrideTier: null };
    }
  }

  function detectsReducedData() {
    const scene = site.scene || {};
    if (typeof scene.detectSaveData === "function") {
      return scene.detectSaveData({
        navigatorInfo: typeof navigator !== "undefined" ? navigator : {},
      });
    }

    const connection = typeof navigator !== "undefined" ? navigator.connection : null;
    if (connection?.saveData === true) return true;

    try {
      return window.matchMedia("(prefers-reduced-data: reduce)").matches === true;
    } catch {
      return false;
    }
  }

  function shouldSkipSceneDownload() {
    const controls = readSceneQualityControls();
    if (controls?.overrideTier) return false;
    return detectsReducedData();
  }

  function loadScriptOnce(src) {
    const existing = document.querySelector(`script[data-dynamic-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") return Promise.resolve();
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.dataset.dynamicSrc = src;
      script.addEventListener(
        "load",
        () => {
          script.dataset.loaded = "true";
          resolve();
        },
        { once: true },
      );
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });
  }

  async function loadAndInitScene() {
    await site.ensureSceneReady();
  }

  site.ensureSceneReady = async function ensureSceneReady() {
    if (site.scene?.initHomeScene) {
      initScene();
      return true;
    }
    if (shouldSkipSceneDownload()) {
      disableSceneHost();
      return false;
    }
    if (!hasWebGL()) {
      disableSceneHost();
      return false;
    }

    try {
      await loadScriptOnce(getSceneScriptUrl());
      initScene();
      return true;
    } catch (error) {
      console.warn("Scene bundle failed to load.", error);
      disableSceneHost();
      return false;
    }
  };

  // Defer the heavier Three.js scene bundle past first paint so the hero LCP
  // and panel controls are interactive before WebGL setup starts.
  function afterFirstPaint(cb) {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(cb, { timeout: 500 });
    } else {
      requestAnimationFrame(() => setTimeout(cb, 0));
    }
  }

  function boot() {
    initUi();
    afterFirstPaint(loadAndInitScene);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
