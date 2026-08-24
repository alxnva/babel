import { Group } from "three";

export function createSceneTower({ parent, profile }) {
  const root = new Group();
  parent.add(root);

  let disposed = false;
  let groundRing = null;
  let lowPower = Boolean(profile?.isLow);
  let orbitRings = [];
  let practicalLights = [];
  root.userData.lowPower = lowPower;

  function applyPracticalLightScale(lighting = {}) {
    const scale = Number.isFinite(lighting.practicalIntensityScale)
      ? lighting.practicalIntensityScale
      : 1;
    practicalLights.forEach((record) => {
      record.light.intensity = lowPower && record.disableOnLow ? 0 : record.baseIntensity * scale;
    });
  }

  return {
    lifecycleOrder: 20,
    root,
    applyQuality(nextProfile = {}) {
      if (disposed) return false;
      lowPower = Boolean(nextProfile.isLow);
      root.userData.lowPower = lowPower;
      applyPracticalLightScale(nextProfile.lighting);
      return true;
    },
    dispose() {
      if (disposed) return false;
      disposed = true;
      root.visible = false;
      groundRing = null;
      orbitRings = [];
      practicalLights = [];
      return true;
    },
    resize({ composition } = {}) {
      if (disposed || !composition) return false;
      root.scale.setScalar(composition.towerScale || 1);
      return true;
    },
    setOrbitDecor({ ground, rings } = {}) {
      groundRing = ground || null;
      orbitRings = Array.isArray(rings) ? rings : [];
    },
    setPracticalLights(records) {
      practicalLights = Array.isArray(records)
        ? records.filter((record) => record?.light && Number.isFinite(record.baseIntensity))
        : [];
      applyPracticalLightScale(profile?.lighting);
    },
    update({ elapsedSeconds = 0 } = {}) {
      if (disposed) return false;
      if (groundRing) {
        groundRing.material.opacity = 0.12 + 0.02 * Math.sin(1.3 * elapsedSeconds);
      }
      orbitRings.forEach((ring, index) => {
        ring.rotation.z = elapsedSeconds * (0.1 + 0.02 * index);
        ring.material.opacity =
          0.12 + 0.018 * index + 0.03 + 0.02 * Math.sin(elapsedSeconds * (1.2 + 0.3 * index));
      });
      return true;
    },
  };
}
