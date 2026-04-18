(() => {
  const site = (window.BabelSite = window.BabelSite || {});
  const THREE_URL = "/vendor/three.min.js?v=648";

  function initUi() {
    const ui = site.ui || {};
    if (typeof ui.initHeroChrome === "function") ui.initHeroChrome();
    if (typeof ui.initPanels === "function") ui.initPanels();
    if (typeof ui.initBottomNavIcons === "function") ui.initBottomNavIcons();
    if (typeof ui.initSceneTuner === "function") ui.initSceneTuner();
  }

  function loadThree() {
    return new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = THREE_URL;
      tag.async = false;
      tag.onload = () => resolve();
      tag.onerror = () => reject(new Error("three.js failed to load"));
      document.head.appendChild(tag);
    });
  }

  function initScene() {
    const scene = site.scene || {};
    if (typeof scene.initHomeScene === "function") scene.initHomeScene();
  }

  // Defer three.js until after the hero has painted so LCP isn't competing
  // with a 600KB vendor script. idleCallback where available, rAF fallback.
  function afterFirstPaint(cb) {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(cb, { timeout: 500 });
    } else {
      requestAnimationFrame(() => setTimeout(cb, 0));
    }
  }

  function boot() {
    initUi();
    afterFirstPaint(() => {
      loadThree().then(initScene).catch(() => {
        // Scene is decorative — swallow load failures so the hero still renders.
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
