(() => {
  const site = (window.BabelSite = window.BabelSite || {});

  function initUi() {
    const ui = site.ui || {};
    if (typeof ui.initHeroChrome === "function") ui.initHeroChrome();
    if (typeof ui.initPanels === "function") ui.initPanels();
    if (typeof ui.initBottomNavIcons === "function") ui.initBottomNavIcons();
    if (typeof ui.initSceneTuner === "function") ui.initSceneTuner();
  }

  function initScene() {
    const scene = site.scene || {};
    if (typeof scene.initHomeScene === "function") scene.initHomeScene();
  }

  // three.js is now bundled into app.js, so there's no separate vendor script
  // to wait on. Still defer scene init past first paint so the hero LCP isn't
  // competing with scene setup work on slow devices.
  function afterFirstPaint(cb) {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(cb, { timeout: 500 });
    } else {
      requestAnimationFrame(() => setTimeout(cb, 0));
    }
  }

  function boot() {
    initUi();
    afterFirstPaint(initScene);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
