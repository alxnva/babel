(() => {
  const t = (window.BabelSite = window.BabelSite || {}),
    n = (t.scene = t.scene || {});
  function e(t) {
    return Math.min(1, Math.max(0, t));
  }
  ((n.clamp01 = e),
    (n.wrap01 = function (t) {
      return ((t % 1) + 1) % 1;
    }),
    (n.wrappedDistance = function (t, n) {
      const e = Math.abs(t - n);
      return Math.min(e, 1 - e);
    }),
    (n.smoothstep01 = function (t) {
      const n = e(t);
      return n * n * (3 - 2 * n);
    }),
    (n.groundHeight = function (t, n) {
      return (
        1.8 * Math.sin(0.055 * t) +
        1.35 * Math.cos(0.052 * n) +
        0.9 * Math.sin(0.031 * (t + n)) +
        0.55 * Math.cos(0.018 * (t - n))
      );
    }),
    (n.supportsWebGL = function () {
      try {
        const t = document.createElement("canvas");
        return !(
          !window.WebGLRenderingContext ||
          (!t.getContext("webgl") && !t.getContext("experimental-webgl"))
        );
      } catch (t) {
        return !1;
      }
    }));
})();
