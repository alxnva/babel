const DEFAULT_FRAME_SECONDS = 1 / 60;

function clampFrameSeconds(value, maximum) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(maximum, value);
}

/**
 * Owns scene frame scheduling without owning any Three.js resources.
 *
 * Animated mode schedules continuously. Reduced-motion mode freezes elapsed
 * scene time and renders only after invalidate(). A separate per-rAF sample is
 * retained when frameStride > 1 so the quality governor does not mistake a
 * deliberate 30fps render cap for 30fps frame pressure.
 */
export function createSceneFrameScheduler({
  cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
  frameStride = 1,
  isRenderable = () => true,
  maxDeltaSeconds = 0.1,
  now = () => globalThis.performance?.now?.() ?? 0,
  onUpdate,
  reducedMotion = false,
  requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
} = {}) {
  if (typeof onUpdate !== "function") {
    throw new TypeError("createSceneFrameScheduler requires onUpdate");
  }
  if (typeof requestFrame !== "function") {
    throw new TypeError("createSceneFrameScheduler requires requestFrame");
  }

  const stableStride = Math.max(1, Math.floor(frameStride || 1));
  let active = false;
  let dirty = true;
  let elapsedSeconds = 0;
  let forceAnimation = false;
  let frameHandle = null;
  let frameTick = 0;
  let lastTimestamp = null;
  let pendingDeltaSeconds = 0;
  let prefersReducedMotion = Boolean(reducedMotion);

  function isAnimated() {
    return !prefersReducedMotion || forceAnimation;
  }

  function schedule() {
    if (!active || frameHandle !== null) return;
    frameHandle = requestFrame(update);
  }

  function resetTiming() {
    lastTimestamp = null;
    pendingDeltaSeconds = 0;
    frameTick = 0;
  }

  function update(timestamp = now()) {
    frameHandle = null;
    if (!active) return;
    if (!isRenderable()) {
      resetTiming();
      return;
    }

    const safeTimestamp = Number.isFinite(timestamp) ? timestamp : now();
    const sampleDeltaSeconds =
      lastTimestamp === null
        ? 0
        : clampFrameSeconds((safeTimestamp - lastTimestamp) / 1000, maxDeltaSeconds);
    lastTimestamp = safeTimestamp;

    const animated = isAnimated();
    if (animated) {
      pendingDeltaSeconds += sampleDeltaSeconds;
      elapsedSeconds += sampleDeltaSeconds;
      schedule();
    }

    if (!animated && !dirty) return;
    if (animated && stableStride > 1) {
      frameTick = (frameTick + 1) % stableStride;
      if (frameTick !== 0) return;
    }

    const deltaSeconds = animated ? clampFrameSeconds(pendingDeltaSeconds, maxDeltaSeconds) : 0;
    pendingDeltaSeconds = 0;
    dirty = false;
    onUpdate({
      deltaSeconds,
      elapsedSeconds,
      reducedMotion: prefersReducedMotion,
      sampleDeltaSeconds: sampleDeltaSeconds > 0 ? sampleDeltaSeconds : DEFAULT_FRAME_SECONDS,
      timestamp: safeTimestamp,
    });
  }

  return {
    dispose() {
      active = false;
      if (frameHandle !== null && typeof cancelFrame === "function") {
        cancelFrame(frameHandle);
      }
      frameHandle = null;
      resetTiming();
    },
    getState() {
      return {
        active,
        dirty,
        elapsedSeconds,
        forceAnimation,
        reducedMotion: prefersReducedMotion,
        scheduled: frameHandle !== null,
      };
    },
    invalidate() {
      dirty = true;
      schedule();
    },
    resume() {
      resetTiming();
      dirty = true;
      schedule();
    },
    setForceAnimation(value) {
      const next = Boolean(value);
      if (forceAnimation === next) return;
      forceAnimation = next;
      resetTiming();
      dirty = true;
      schedule();
    },
    setReducedMotion(value) {
      const next = Boolean(value);
      if (prefersReducedMotion === next) return;
      prefersReducedMotion = next;
      resetTiming();
      dirty = true;
      schedule();
    },
    start() {
      if (active) return;
      active = true;
      dirty = true;
      resetTiming();
      schedule();
    },
    update,
  };
}

/**
 * Coalesces resize bursts and suppresses work when the CSS viewport is
 * unchanged. It owns only its queued callback; renderer/composer disposal
 * remains with their respective owners.
 */
export function createSceneResizeController({
  cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
  onResize,
  readSize,
  requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
} = {}) {
  if (typeof onResize !== "function" || typeof readSize !== "function") {
    throw new TypeError("createSceneResizeController requires readSize and onResize");
  }
  if (typeof requestFrame !== "function") {
    throw new TypeError("createSceneResizeController requires requestFrame");
  }

  let disposed = false;
  let frameHandle = null;
  let lastHeight = null;
  let lastPixelRatio = null;
  let lastWidth = null;

  function update({ force = false } = {}) {
    if (disposed) return false;
    const size = readSize() || {};
    const width = Math.max(1, Number(size.width) || 0);
    const height = Math.max(1, Number(size.height) || 0);
    const pixelRatio = Math.max(0.1, Number(size.pixelRatio) || 1);
    if (
      !force &&
      width === lastWidth &&
      height === lastHeight &&
      pixelRatio === lastPixelRatio
    ) {
      return false;
    }
    lastWidth = width;
    lastHeight = height;
    lastPixelRatio = pixelRatio;
    onResize({ height, pixelRatio, width });
    return true;
  }

  function flush() {
    frameHandle = null;
    update();
  }

  return {
    dispose() {
      disposed = true;
      if (frameHandle !== null && typeof cancelFrame === "function") {
        cancelFrame(frameHandle);
      }
      frameHandle = null;
    },
    getSize() {
      return { height: lastHeight, pixelRatio: lastPixelRatio, width: lastWidth };
    },
    resize() {
      if (disposed || frameHandle !== null) return;
      frameHandle = requestFrame(flush);
    },
    update,
  };
}

function collectTexture(value, textures) {
  if (!value) return;
  if (value.isTexture) {
    textures.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectTexture(entry, textures));
  }
}

function collectMaterialResources(material, materials, textures) {
  if (!material || materials.has(material)) return;
  materials.add(material);
  for (const value of Object.values(material)) {
    collectTexture(value, textures);
  }
  if (material.uniforms) {
    for (const uniform of Object.values(material.uniforms)) {
      collectTexture(uniform?.value, textures);
    }
  }
}

/**
 * Releases resources owned by a scene graph exactly once. Render-target
 * textures are left to their render target so cube captures are not
 * double-disposed through both an envMap and WebGLRenderTarget.
 */
export function disposeSceneResources(root, { renderTargets = [] } = {}) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const ownedRenderTargets = new Set(renderTargets.filter(Boolean));

  collectTexture(root?.background, textures);
  collectTexture(root?.environment, textures);
  root?.traverse?.((object) => {
    if (object.geometry) geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    objectMaterials.forEach((material) =>
      collectMaterialResources(material, materials, textures),
    );
    if (object.renderTarget?.isWebGLRenderTarget) {
      ownedRenderTargets.add(object.renderTarget);
    }
  });

  const renderTargetTextures = new Set();
  ownedRenderTargets.forEach((target) => {
    collectTexture(target.texture, renderTargetTextures);
    collectTexture(target.textures, renderTargetTextures);
    collectTexture(target.depthTexture, renderTargetTextures);
  });

  geometries.forEach((geometry) => geometry.dispose?.());
  materials.forEach((material) => material.dispose?.());
  textures.forEach((texture) => {
    if (!renderTargetTextures.has(texture)) texture.dispose?.();
  });
  ownedRenderTargets.forEach((target) => target.dispose?.());

  return {
    geometries: geometries.size,
    materials: materials.size,
    renderTargets: ownedRenderTargets.size,
    textures: [...textures].filter((texture) => !renderTargetTextures.has(texture)).length,
  };
}

export function disposeSceneRuntimeResources({
  postprocessPipeline,
  renderer,
  renderTargets,
  scene,
} = {}) {
  postprocessPipeline?.dispose?.();
  const disposed = disposeSceneResources(scene, { renderTargets });
  scene?.clear?.();
  renderer?.dispose?.();
  renderer?.forceContextLoss?.();
  const canvas = renderer?.domElement;
  if (canvas?.parentNode && typeof canvas.parentNode.removeChild === "function") {
    canvas.parentNode.removeChild(canvas);
  } else {
    canvas?.remove?.();
  }
  return disposed;
}

export function hasMeaningfulScalarChange(previous, next, epsilon = 1e-4) {
  return (
    !Number.isFinite(previous) ||
    !Number.isFinite(next) ||
    Math.abs(previous - next) > Math.max(0, epsilon)
  );
}
