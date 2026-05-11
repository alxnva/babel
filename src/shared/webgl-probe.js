// WebGL feature probe shared between the UI boot path and the scene bundle.
//
// `main.js` calls this before triggering the scene-bundle download so we skip
// the network cost on browsers without WebGL. `scene/helpers.js` re-exposes
// it as `scene.supportsWebGL` for the scene-side guard at init time.
(() => {
  const site = (window.BabelSite = window.BabelSite || {});
  const shared = (site.shared = site.shared || {});

  shared.supportsWebGL = function supportsWebGL() {
    try {
      const probe = document.createElement("canvas");
      return !(
        !window.WebGLRenderingContext ||
        (!probe.getContext("webgl") && !probe.getContext("experimental-webgl"))
      );
    } catch {
      return false;
    }
  };
})();
