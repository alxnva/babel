import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import * as THREE from "three";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");
const visibilityPath = path.join(projectRoot, "src", "scene", "visibility.js");

async function loadVisibility() {
  const window = { BabelSite: {} };
  const source = await readFile(visibilityPath, "utf8");
  vm.runInNewContext(source, { window, console }, { filename: visibilityPath });
  return window.BabelSite.scene;
}

function framedCamera() {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return camera;
}

test("core importance short-circuits without touching the frustum", async () => {
  const scene = await loadVisibility();
  const camera = framedCamera();
  const tracker = scene.createSceneVisibilityTracker({ THREE, camera });
  tracker.updateCameraState();

  const bucket = tracker.classifySphere({
    center: new THREE.Vector3(500, 500, 500),
    radius: 1,
    importance: "core",
  });
  assert.equal(bucket, "core");
});

test("classifySphere uses default previousBucket when none is supplied", async () => {
  const scene = await loadVisibility();
  const camera = framedCamera();
  const tracker = scene.createSceneVisibilityTracker({ THREE, camera });
  tracker.updateCameraState();

  const bucket = tracker.classifySphere({
    center: new THREE.Vector3(0, 0, 0),
    radius: 2,
    importance: "nearAtmosphere",
  });
  assert.equal(bucket, "nearAtmosphere");
});

test("rotating the camera flips front and back buckets for the same world points", async () => {
  const scene = await loadVisibility();
  const camera = framedCamera();
  const tracker = scene.createSceneVisibilityTracker({ THREE, camera });
  tracker.updateCameraState();

  const towardNegZ = new THREE.Vector3(0, 0, 0);
  const towardPosZ = new THREE.Vector3(0, 0, 20);

  assert.equal(
    tracker.classifySphere({ center: towardNegZ, radius: 2, importance: "nearAtmosphere" }),
    "nearAtmosphere",
  );
  assert.equal(
    tracker.classifySphere({ center: towardPosZ, radius: 2, importance: "nearAtmosphere" }),
    "backsideDecor",
    "a point behind the default camera is not framed",
  );

  camera.lookAt(0, 0, 20);
  camera.updateMatrixWorld();
  tracker.updateCameraState();

  assert.equal(
    tracker.classifySphere({ center: towardPosZ, radius: 2, importance: "nearAtmosphere" }),
    "nearAtmosphere",
    "after rotating to face +z, the previously-rear point is now framed",
  );
  assert.equal(
    tracker.classifySphere({ center: towardNegZ, radius: 2, importance: "nearAtmosphere" }),
    "backsideDecor",
    "after rotating to face +z, the previously-framed point is now behind the camera",
  );
});

test("midAtmosphere hysteresis keeps an in-bucket sphere when it drifts to the frustum edge", async () => {
  const scene = await loadVisibility();
  const camera = framedCamera();
  const tracker = scene.createSceneVisibilityTracker({ THREE, camera });
  tracker.updateCameraState();

  // A large sphere centered on the camera's horizontal axis: frontDot is ~0,
  // radius 10 guarantees frustum intersection. Within [-0.42, -0.2) is the
  // hysteresis window for midAtmosphere; frontDot = 0 sits above the cold
  // threshold, so this also sanity-checks the cold path.
  const centered = {
    center: new THREE.Vector3(4, 0, 10),
    radius: 10,
    importance: "midAtmosphere",
  };

  const cold = tracker.classifySphere({ ...centered, previousBucket: "backsideDecor" });
  const sticky = tracker.classifySphere({ ...centered, previousBucket: "midAtmosphere" });
  assert.equal(cold, "midAtmosphere");
  assert.equal(sticky, "midAtmosphere");

  // Push the sphere behind the camera (frontDot < -0.42). Neither classification
  // can save it now, so both collapse to backsideDecor.
  const behind = { ...centered, center: new THREE.Vector3(4, 0, 30) };
  assert.equal(
    tracker.classifySphere({ ...behind, previousBucket: "midAtmosphere" }),
    "backsideDecor",
  );
  assert.equal(
    tracker.classifySphere({ ...behind, previousBucket: "backsideDecor" }),
    "backsideDecor",
  );
});

test("shouldRenderBucket and shouldUpdateBucket treat only backsideDecor as skippable", async () => {
  const scene = await loadVisibility();
  const tracker = scene.createSceneVisibilityTracker({ THREE, camera: framedCamera() });

  for (const bucket of ["core", "nearAtmosphere", "midAtmosphere"]) {
    assert.equal(tracker.shouldRenderBucket(bucket), true, `${bucket} should render`);
    assert.equal(tracker.shouldUpdateBucket(bucket), true, `${bucket} should update`);
  }
  assert.equal(tracker.shouldRenderBucket("backsideDecor"), false);
  assert.equal(tracker.shouldUpdateBucket("backsideDecor"), false);
});
