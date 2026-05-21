// Color parsing helpers shared between the UI and scene bundles.
//
// `hexToRgb` returns an `{r, g, b}` object for use in palette/dither math.
// `hexToRgba` builds on it to return a CSS rgba() string. Both tolerate
// missing `#` prefixes and clamp invalid components to 0 so callers don't
// have to validate palette inputs.
(() => {
  const site = (window.BabelSite = window.BabelSite || {});
  const shared = (site.shared = site.shared || {});

  function hexToRgb(hex) {
    const clean = String(hex || "#000000").replace("#", "");
    return {
      r: Number.parseInt(clean.slice(0, 2), 16) || 0,
      g: Number.parseInt(clean.slice(2, 4), 16) || 0,
      b: Number.parseInt(clean.slice(4, 6), 16) || 0,
    };
  }

  function hexToRgba(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  shared.hexToRgb = hexToRgb;
  shared.hexToRgba = hexToRgba;
})();
