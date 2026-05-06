import { Vector2 } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const PASS_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GRADING_SHADER = {
  name: "BabelGradingShader",
  uniforms: {
    tDiffuse: { value: null },
  },
  vertexShader: PASS_VERTEX_SHADER,
  fragmentShader: `
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 saturateColor(vec3 color, float amount) {
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  return mix(vec3(luma), color, amount);
}

void main() {
  vec4 texel = texture2D(tDiffuse, vUv);
  vec3 color = texel.rgb;
  float luma = dot(color, vec3(0.299, 0.587, 0.114));

  color = (color - 0.5) * 1.068 + 0.5;

  vec3 shadowLift = vec3(0.102, 0.086, 0.071);
  vec3 warmMidtone = color * vec3(1.03, 1.015, 0.979);
  vec3 coolHighlight = color * vec3(0.987, 1.0, 1.034);

  float shadowMix = 1.0 - smoothstep(0.08, 0.32, luma);
  float midMix = smoothstep(0.22, 0.46, luma) * (1.0 - smoothstep(0.62, 0.82, luma));
  float highlightMix = smoothstep(0.68, 0.96, luma);

  color = mix(color, max(color, shadowLift), 0.238 * shadowMix);
  color = mix(color, warmMidtone, 0.306 * midMix);
  color = mix(color, coolHighlight, 0.204 * highlightMix);
  color = saturateColor(color, 1.0425);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), texel.a);
}
`,
};

const VIGNETTE_GRAIN_SHADER = {
  name: "BabelVignetteGrainShader",
  uniforms: {
    tDiffuse: { value: null },
    uVignetteEnabled: { value: 1 },
    uGrainEnabled: { value: 1 },
  },
  vertexShader: PASS_VERTEX_SHADER,
  fragmentShader: `
uniform sampler2D tDiffuse;
uniform int uVignetteEnabled;
uniform int uGrainEnabled;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec4 texel = texture2D(tDiffuse, vUv);
  vec3 color = texel.rgb;

  if (uVignetteEnabled == 1) {
    float dist = distance(vUv, vec2(0.5));
    float vignette = smoothstep(0.4, 1.0, dist);
    color *= mix(1.0, 0.85, vignette);
  }

  if (uGrainEnabled == 1) {
    float grain = hash(floor(vUv * vec2(1280.0, 720.0))) - 0.5;
    color += grain * 0.04;
  }

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), texel.a);
}
`,
};

function getSize(renderer) {
  if (renderer && typeof renderer.getSize === "function") {
    return renderer.getSize(new Vector2());
  }
  return new Vector2(1, 1);
}

export function createPostprocessPipeline(renderer, scene, camera, qualityProfile, options = {}) {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const size = getSize(renderer);
  const bloomPass = new UnrealBloomPass(size, 0.3, 0.6, 0.85);
  const gradingPass = new ShaderPass(GRADING_SHADER);
  const vignetteGrainPass = new ShaderPass(VIGNETTE_GRAIN_SHADER);
  const matchMedia = options.matchMedia || globalThis.window?.matchMedia?.bind(globalThis.window);
  const transparencyQuery = matchMedia?.("(prefers-reduced-transparency: reduce)");

  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(gradingPass);
  composer.addPass(vignetteGrainPass);

  let reducedTransparency = Boolean(transparencyQuery?.matches);

  function applyProfile(profile = {}) {
    const gradingEnabled = profile.postprocessGrading !== false;
    const bloomEnabled = profile.postprocessBloom === true;
    const vignetteEnabled = profile.postprocessVignette === true && !reducedTransparency;
    const grainEnabled = profile.postprocessGrain === true;

    bloomPass.enabled = bloomEnabled;
    gradingPass.enabled = gradingEnabled;
    vignetteGrainPass.enabled = vignetteEnabled || grainEnabled;
    vignetteGrainPass.uniforms.uVignetteEnabled.value = vignetteEnabled ? 1 : 0;
    vignetteGrainPass.uniforms.uGrainEnabled.value = grainEnabled ? 1 : 0;
  }

  function onTransparencyChange(event) {
    reducedTransparency = Boolean(event?.matches);
    applyProfile(currentProfile);
  }

  let currentProfile = qualityProfile || {};
  applyProfile(currentProfile);

  if (typeof transparencyQuery?.addEventListener === "function") {
    transparencyQuery.addEventListener("change", onTransparencyChange);
  } else if (typeof transparencyQuery?.addListener === "function") {
    transparencyQuery.addListener(onTransparencyChange);
  }

  return {
    composer,
    passes: {
      bloom: bloomPass,
      grading: gradingPass,
      render: renderPass,
      vignetteGrain: vignetteGrainPass,
    },
    dispose() {
      if (typeof transparencyQuery?.removeEventListener === "function") {
        transparencyQuery.removeEventListener("change", onTransparencyChange);
      } else if (typeof transparencyQuery?.removeListener === "function") {
        transparencyQuery.removeListener(onTransparencyChange);
      }
      for (const pass of composer.passes) {
        if (typeof pass.dispose === "function") pass.dispose();
      }
      if (typeof composer.dispose === "function") composer.dispose();
    },
    setQualityProfile(profile = {}) {
      currentProfile = profile;
      applyProfile(currentProfile);
    },
  };
}
