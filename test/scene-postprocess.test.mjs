import assert from "node:assert/strict";
import test from "node:test";
import { createPostprocessPipeline } from "../src/scene/postprocess.js";

function createRendererMock() {
  return {
    autoClearColor: true,
    autoClearDepth: true,
    autoClearStencil: true,
    clear() {},
    getPixelRatio() {
      return 1;
    },
    getRenderTarget() {
      return null;
    },
    getSize(target) {
      target.width = 800;
      target.height = 600;
      return target;
    },
    setRenderTarget() {},
  };
}

function createMatchMedia(matches = false) {
  const query = {
    matches,
    addEventListener() {},
    removeEventListener() {},
  };
  return () => query;
}

function createPipeline(profile, { reducedTransparency = false } = {}) {
  return createPostprocessPipeline(createRendererMock(), {}, {}, profile, {
    matchMedia: createMatchMedia(reducedTransparency),
  });
}

test("postprocess pipeline creates render, bloom, grading, and vignette-grain passes", () => {
  const pipeline = createPipeline({
    postprocessGrading: true,
    postprocessBloom: true,
    postprocessVignette: true,
    postprocessGrain: true,
  });

  assert.equal(pipeline.composer.passes.length, 4);
  assert.equal(pipeline.composer.passes[0], pipeline.passes.render);
  assert.equal(pipeline.composer.passes[1], pipeline.passes.bloom);
  assert.equal(pipeline.composer.passes[2], pipeline.passes.grading);
  assert.equal(pipeline.composer.passes[3], pipeline.passes.vignetteGrain);
  assert.equal(pipeline.passes.bloom.strength, 0.3);

  pipeline.dispose();
});

test("high tier enables bloom, grading, vignette, and grain", () => {
  const pipeline = createPipeline({
    postprocessGrading: true,
    postprocessBloom: true,
    postprocessVignette: true,
    postprocessGrain: true,
  });

  assert.equal(pipeline.passes.bloom.enabled, true);
  assert.equal(pipeline.passes.grading.enabled, true);
  assert.equal(pipeline.passes.vignetteGrain.enabled, true);
  assert.equal(pipeline.passes.vignetteGrain.uniforms.uVignetteEnabled.value, 1);
  assert.equal(pipeline.passes.vignetteGrain.uniforms.uGrainEnabled.value, 1);

  pipeline.dispose();
});

test("balanced tier disables bloom while keeping grading, vignette, and grain", () => {
  const pipeline = createPipeline({
    postprocessGrading: true,
    postprocessBloom: false,
    postprocessVignette: true,
    postprocessGrain: true,
  });

  assert.equal(pipeline.passes.bloom.enabled, false);
  assert.equal(pipeline.passes.grading.enabled, true);
  assert.equal(pipeline.passes.vignetteGrain.enabled, true);
  assert.equal(pipeline.passes.vignetteGrain.uniforms.uVignetteEnabled.value, 1);
  assert.equal(pipeline.passes.vignetteGrain.uniforms.uGrainEnabled.value, 1);

  pipeline.dispose();
});

test("low tier keeps only grading enabled", () => {
  const pipeline = createPipeline({
    postprocessGrading: true,
    postprocessBloom: false,
    postprocessVignette: false,
    postprocessGrain: false,
  });

  assert.equal(pipeline.passes.bloom.enabled, false);
  assert.equal(pipeline.passes.grading.enabled, true);
  assert.equal(pipeline.passes.vignetteGrain.enabled, false);
  assert.equal(pipeline.passes.vignetteGrain.uniforms.uVignetteEnabled.value, 0);
  assert.equal(pipeline.passes.vignetteGrain.uniforms.uGrainEnabled.value, 0);

  pipeline.dispose();
});

test("reduced transparency disables vignette but leaves static grain enabled", () => {
  const pipeline = createPipeline(
    {
      postprocessGrading: true,
      postprocessBloom: false,
      postprocessVignette: true,
      postprocessGrain: true,
    },
    { reducedTransparency: true },
  );

  assert.equal(pipeline.passes.vignetteGrain.enabled, true);
  assert.equal(pipeline.passes.vignetteGrain.uniforms.uVignetteEnabled.value, 0);
  assert.equal(pipeline.passes.vignetteGrain.uniforms.uGrainEnabled.value, 1);

  pipeline.dispose();
});

test("setQualityProfile updates adaptive pass enablement without rebuilding the composer", () => {
  const pipeline = createPipeline({
    postprocessGrading: true,
    postprocessBloom: true,
    postprocessVignette: true,
    postprocessGrain: true,
  });

  pipeline.setQualityProfile({
    postprocessGrading: true,
    postprocessBloom: false,
    postprocessVignette: false,
    postprocessGrain: false,
  });

  assert.equal(pipeline.passes.bloom.enabled, false);
  assert.equal(pipeline.passes.grading.enabled, true);
  assert.equal(pipeline.passes.vignetteGrain.enabled, false);

  pipeline.dispose();
});

test("dispose releases pipeline resources without throwing", () => {
  const pipeline = createPipeline({
    postprocessGrading: true,
    postprocessBloom: true,
    postprocessVignette: true,
    postprocessGrain: true,
  });

  assert.doesNotThrow(() => pipeline.dispose());
});
