(() => {
  const site = (window.BabelSite = window.BabelSite || {});
  const scene = (site.scene = site.scene || {});

  function clamp01(val) {
    return Math.min(1, Math.max(0, val));
  }

  scene.clamp01 = clamp01;

  scene.wrap01 = function (val) {
    return ((val % 1) + 1) % 1;
  };

  scene.wrappedDistance = function (aa, bb) {
    const diff = Math.abs(aa - bb);
    return Math.min(diff, 1 - diff);
  };

  scene.smoothstep01 = function (val) {
    const xx = clamp01(val);
    return xx * xx * (3 - 2 * xx);
  };

  scene.groundHeight = function (xx, yy) {
    return (
      1.8 * Math.sin(0.055 * xx) +
      1.35 * Math.cos(0.052 * yy) +
      0.9 * Math.sin(0.031 * (xx + yy)) +
      0.55 * Math.cos(0.018 * (xx - yy))
    );
  };

  scene.supportsWebGL = function () {
    try {
      const canvas = document.createElement("canvas");
      return !(
        !window.WebGLRenderingContext ||
        (!canvas.getContext("webgl") && !canvas.getContext("experimental-webgl"))
      );
    } catch (err) {
      return false;
    }
  };
})();
