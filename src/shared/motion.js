// prefers-reduced-motion helpers shared across UI modules.
//
// `prefersReducedMotion()` is a one-shot boolean for use at call time.
// `reducedMotionQuery()` returns the live MediaQueryList so callers that
// need to react to the user toggling the OS setting mid-session can subscribe.
(() => {
  const site = (window.BabelSite = window.BabelSite || {});
  const shared = (site.shared = site.shared || {});

  function reducedMotionQuery() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return null;
    }
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)");
    } catch {
      return null;
    }
  }

  function prefersReducedMotion() {
    return reducedMotionQuery()?.matches === true;
  }

  shared.reducedMotionQuery = reducedMotionQuery;
  shared.prefersReducedMotion = prefersReducedMotion;
})();
