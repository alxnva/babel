(() => {
  const site = (window.BabelSite = window.BabelSite || {});
  const scene = (site.scene = site.scene || {});

  function createSceneVisibilityTracker({ THREE, camera }) {
    const projectionViewMatrix = new THREE.Matrix4();
    const frustum = new THREE.Frustum();
    const forward = new THREE.Vector3();
    const toCenter = new THREE.Vector3();
    const testSphere = new THREE.Sphere();
    const inflatedSphere = new THREE.Sphere();

    function updateCameraState() {
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      projectionViewMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projectionViewMatrix);
      camera.getWorldDirection(forward);
    }

    function classifySphere({
      center,
      radius = 0,
      importance = "midAtmosphere",
      previousBucket = "backsideDecor",
    }) {
      if (importance === "core") return "core";

      testSphere.center.copy(center);
      testSphere.radius = Math.max(0.01, radius);
      inflatedSphere.center.copy(center);
      inflatedSphere.radius = Math.max(1.5, radius * 1.65 + 1.5);

      const inFrustum = frustum.intersectsSphere(testSphere);
      const nearFrustum = inFrustum || frustum.intersectsSphere(inflatedSphere);

      toCenter.copy(center).sub(camera.position);
      const distance = toCenter.length();
      const frontDot = distance > 1e-6 ? toCenter.multiplyScalar(1 / distance).dot(forward) : 1;

      if (importance === "nearAtmosphere") {
        const nearThreshold = previousBucket === "nearAtmosphere" ? -0.12 : 0.02;
        const edgeThreshold = previousBucket === "nearAtmosphere" ? -0.28 : -0.08;
        if (inFrustum && frontDot >= nearThreshold) return "nearAtmosphere";
        if (nearFrustum && frontDot >= edgeThreshold) return "midAtmosphere";
        return "backsideDecor";
      }

      if (importance === "midAtmosphere") {
        const midThreshold = previousBucket === "midAtmosphere" ? -0.42 : -0.2;
        const edgeThreshold = previousBucket === "midAtmosphere" ? -0.72 : -0.45;
        if (inFrustum && frontDot >= midThreshold) return "midAtmosphere";
        if (nearFrustum && frontDot >= edgeThreshold) return "midAtmosphere";
        return "backsideDecor";
      }

      const frontThreshold = previousBucket === "nearAtmosphere" ? -0.16 : 0.05;
      const sideThreshold =
        previousBucket === "midAtmosphere" || previousBucket === "nearAtmosphere" ? -0.58 : -0.35;
      if (inFrustum && frontDot >= frontThreshold) return "nearAtmosphere";
      if (nearFrustum && frontDot >= sideThreshold) return "midAtmosphere";
      return "backsideDecor";
    }

    return {
      classifySphere,
      shouldRenderBucket(bucket) {
        return bucket !== "backsideDecor";
      },
      shouldUpdateBucket(bucket) {
        return bucket !== "backsideDecor";
      },
      updateCameraState,
    };
  }

  scene.createSceneVisibilityTracker = createSceneVisibilityTracker;
})();
