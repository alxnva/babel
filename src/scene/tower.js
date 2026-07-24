import { Group } from "three";

export function createSceneTower({ parent, profile }) {
  const root = new Group();
  parent.add(root);

  let disposed = false;
  let groundRing = null;
  let lowPower = Boolean(profile?.isLow);
  let orbitRings = [];
  root.userData.lowPower = lowPower;

  return {
    lifecycleOrder: 20,
    root,
    applyQuality(nextProfile = {}) {
      if (disposed) return false;
      lowPower = Boolean(nextProfile.isLow);
      root.userData.lowPower = lowPower;
      return true;
    },
    dispose() {
      if (disposed) return false;
      disposed = true;
      root.visible = false;
      groundRing = null;
      orbitRings = [];
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
    update({ elapsedSeconds = 0 } = {}) {
      if (disposed) return false;
      if (groundRing) {
        groundRing.material.opacity = 0.12 + 0.02 * Math.sin(1.3 * elapsedSeconds);
      }
      orbitRings.forEach((ring, index) => {
        ring.rotation.z = elapsedSeconds * (0.1 + 0.02 * index);
        ring.material.opacity =
          0.12 +
          0.018 * index +
          0.03 +
          0.02 * Math.sin(elapsedSeconds * (1.2 + 0.3 * index));
      });
      return true;
    },
  };
}
