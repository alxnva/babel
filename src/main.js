(() => {
  const n = (window.BabelSite = window.BabelSite || {});
  function t() {
    const t = n.ui || {},
      e = n.scene || {};
    ("function" == typeof t.initHeroChrome && t.initHeroChrome(),
      "function" == typeof t.initPanels && t.initPanels(),
      "function" == typeof t.initBottomNavIcons && t.initBottomNavIcons(),
      "function" == typeof e.initHomeScene && e.initHomeScene(),
      "function" == typeof t.initSceneTuner && t.initSceneTuner());
  }
  "loading" === document.readyState
    ? document.addEventListener("DOMContentLoaded", t, { once: !0 })
    : t();
})();
