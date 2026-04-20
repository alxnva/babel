// Anchored coordinate constants for the Three.js scene.
//
// Convention (ported from dead-signal-3d-draft): positions are feet-anchored.
// FLOOR_Y is the implicit y=0 reference; the procedural ground surface
// (scene.groundHeight) undulates around it. Every fixed spatial value below
// ought to read as an offset, distance, or extent relative to this anchor.
//
// Vector-valued constants are stored as `[x, y, z]` arrays (not THREE.Vector3)
// because the scene IIFEs execute at page load — before three.min.js is
// injected by main.js. Callers construct the Vector3 at use time with
// `new THREE.Vector3(...scene.WORLD.MOON_POSITION)`.
(() => {
  const site = (window.BabelSite = window.BabelSite || {});
  const scene = (site.scene = site.scene || {});

  scene.WORLD = Object.freeze({
    // --- Ground plane ---
    FLOOR_Y: 0,
    GROUND_RADIUS: 88,
    GROUND_OVERLAY_RADIUS: 70,

    // --- Sky & atmosphere ---
    SKY_DOME_RADIUS: 130,

    // --- Lights (positions are world-space, feet-anchored) ---
    // The sky shader reads SUN_DIRECTION as a normalized direction vector;
    // callers must `.normalize()` after construction.
    SUN_DIRECTION: Object.freeze([18, 15, 33]),
    FILL_LIGHT_POSITION: Object.freeze([-18, 22, -14]),

    // --- Moon / orbital glow anchor ---
    MOON_POSITION: Object.freeze([-75, 50, -60]),

    // --- Main camera (PerspectiveCamera) ---
    CAMERA_FOV: 45,
    CAMERA_NEAR: 0.1,
    CAMERA_FAR: 240,

    // --- Sun shadow frustum (orthographic, symmetric around the scene) ---
    SHADOW_CAMERA_HALF_EXTENT: 60,
    SHADOW_CAMERA_NEAR: 1,
    SHADOW_CAMERA_FAR: 120,
  });
})();
