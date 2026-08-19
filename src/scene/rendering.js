import {
  AmbientLight,
  ColorManagement,
  DirectionalLight,
  Fog,
  HemisphereLight,
  NoToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
} from "three";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { createPostprocessPipeline } from "./postprocess.js";
import { disposeSceneRuntimeResources } from "./runtime.js";

function setRendererOutputColorSpace(renderer, threeExports = {}) {
  const srgbColorSpace = threeExports.SRGBColorSpace || SRGBColorSpace;
  const srgbEncoding = threeExports.sRGBEncoding;
  if (srgbColorSpace && "outputColorSpace" in renderer) {
    renderer.outputColorSpace = srgbColorSpace;
  } else if (srgbEncoding && "outputEncoding" in renderer) {
    renderer.outputEncoding = srgbEncoding;
  }
}

export function createSceneRendering({
  container,
  height,
  lighting,
  onContextLost,
  onContextRestored,
  onInvalidate,
  profile,
  threeExports,
  width,
  world,
  createOutlinePass = (size, homeScene, camera) =>
    new OutlinePass(size, homeScene, camera),
  createPipeline = createPostprocessPipeline,
  createRenderer = (options) => new WebGLRenderer(options),
  disposeResources = disposeSceneRuntimeResources,
}) {
  if (ColorManagement) ColorManagement.enabled = false;

  const homeScene = new Scene();
  homeScene.fog = new Fog(lighting.fogColor, lighting.fogNear, lighting.fogFar);

  const camera = new PerspectiveCamera(
    world.CAMERA_FOV,
    width / height,
    world.CAMERA_NEAR,
    world.CAMERA_FAR,
  );
  const renderer = createRenderer({
    alpha: true,
    antialias: profile.antialias,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0, 0);
  setRendererOutputColorSpace(renderer, threeExports);
  renderer.toneMapping = NoToneMapping;
  renderer._useLegacyLights = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const postprocessPipeline = createPipeline(renderer, homeScene, camera, profile, {
    onInvalidate,
  });
  const composer = postprocessPipeline.composer;
  let currentHeight = height;
  let currentWidth = width;
  let outlinePass = null;

  const handleContextLost = (event) => {
    event?.preventDefault?.();
    onContextLost?.(event);
  };
  const handleContextRestored = (event) => {
    onContextRestored?.(event);
  };
  renderer.domElement?.addEventListener?.("webglcontextlost", handleContextLost);
  renderer.domElement?.addEventListener?.("webglcontextrestored", handleContextRestored);

  const ambientLight = new AmbientLight(lighting.ambientColor, lighting.ambientIntensity);
  const hemisphereLight = new HemisphereLight(
    lighting.hemisphereSkyColor,
    lighting.hemisphereGroundColor,
    lighting.hemisphereIntensity,
  );
  const sunLight = new DirectionalLight(
    lighting.directionalColor,
    lighting.directionalIntensity,
  );
  const fillLight = new DirectionalLight(
    lighting.fillColor ?? 0x596b9c,
    lighting.fillIntensity ?? 0.58,
  );
  sunLight.position.set(
    lighting.directionalPosition.x,
    lighting.directionalPosition.y,
    lighting.directionalPosition.z,
  );
  sunLight.shadow.camera.left = -world.SHADOW_CAMERA_HALF_EXTENT;
  sunLight.shadow.camera.right = world.SHADOW_CAMERA_HALF_EXTENT;
  sunLight.shadow.camera.top = world.SHADOW_CAMERA_HALF_EXTENT;
  sunLight.shadow.camera.bottom = -world.SHADOW_CAMERA_HALF_EXTENT;
  sunLight.shadow.camera.near = world.SHADOW_CAMERA_NEAR;
  sunLight.shadow.camera.far = world.SHADOW_CAMERA_FAR;
  sunLight.shadow.bias = -0.00045;
  sunLight.shadow.normalBias = 0.028;
  sunLight.shadow.radius = 2.6;
  fillLight.position.set(...(lighting.fillPosition ?? world.FILL_LIGHT_POSITION));
  homeScene.add(ambientLight, hemisphereLight, sunLight, fillLight);

  const renderTargets = new Set();
  let disposed = false;
  let disposeResult = null;

  const rendering = {
    camera,
    composer,
    get disposeResult() {
      return disposeResult;
    },
    homeScene,
    lifecycleOrder: 100,
    lights: {
      ambient: ambientLight,
      fill: fillLight,
      hemisphere: hemisphereLight,
      sun: sunLight,
    },
    get outlinePass() {
      return outlinePass;
    },
    postprocessPipeline,
    renderer,
    ensureOutlinePass() {
      if (disposed) return null;
      if (outlinePass) return outlinePass;
      outlinePass = createOutlinePass(
        new Vector2(currentWidth, currentHeight),
        homeScene,
        camera,
      );
      outlinePass.edgeStrength = 2;
      outlinePass.edgeThickness = 1;
      outlinePass.visibleEdgeColor.set(0xd9a46d);
      outlinePass.hiddenEdgeColor.set(0x4b403f);
      outlinePass.enabled = false;
      composer.addPass(outlinePass);
      return outlinePass;
    },
    applyQuality(nextProfile, { pixelRatio } = {}) {
      if (disposed) return false;
      homeScene.fog.near = nextProfile.lighting.fogNear;
      homeScene.fog.far = nextProfile.lighting.fogFar;
      ambientLight.intensity = nextProfile.lighting.ambientIntensity;
      hemisphereLight.intensity = nextProfile.lighting.hemisphereIntensity;
      sunLight.intensity = nextProfile.lighting.directionalIntensity;
      if (Number.isFinite(nextProfile.lighting.fillIntensity)) {
        fillLight.intensity = nextProfile.lighting.fillIntensity;
      }
      fillLight.visible = Boolean(nextProfile.lighting.extraDirectional);
      renderer.shadowMap.enabled = Boolean(nextProfile.shadows.enabled);
      sunLight.castShadow = Boolean(nextProfile.shadows.enabled);
      if (nextProfile.shadows.enabled && nextProfile.shadows.mapSize > 0) {
        sunLight.shadow.mapSize.width = nextProfile.shadows.mapSize;
        sunLight.shadow.mapSize.height = nextProfile.shadows.mapSize;
        sunLight.shadow.needsUpdate = true;
      }
      if (Number.isFinite(pixelRatio)) renderer.setPixelRatio(pixelRatio);
      postprocessPipeline.setQualityProfile(nextProfile);
      return true;
    },
    dispose() {
      if (disposed) return false;
      disposed = true;
      renderer.domElement?.removeEventListener?.("webglcontextlost", handleContextLost);
      renderer.domElement?.removeEventListener?.(
        "webglcontextrestored",
        handleContextRestored,
      );
      if (outlinePass) {
        outlinePass.enabled = false;
        outlinePass.selectedObjects = [];
      }
      disposeResult = disposeResources({
        postprocessPipeline,
        renderer,
        renderTargets: [...renderTargets],
        scene: homeScene,
      });
      renderTargets.clear();
      return disposeResult;
    },
    resize({ cameraFov, height: nextHeight, width: nextWidth }) {
      if (disposed) return false;
      currentHeight = nextHeight;
      currentWidth = nextWidth;
      if (Number.isFinite(cameraFov)) camera.fov = cameraFov;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
      composer.setSize(nextWidth, nextHeight);
      postprocessPipeline.resize?.(nextWidth, nextHeight);
      outlinePass?.setSize(nextWidth, nextHeight);
      return true;
    },
    trackRenderTarget(renderTarget) {
      if (!disposed && renderTarget) renderTargets.add(renderTarget);
      return renderTarget;
    },
    update({ render = true } = {}) {
      if (disposed) return false;
      if (render) composer.render();
      return true;
    },
  };

  return rendering;
}
