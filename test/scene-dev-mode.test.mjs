import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");
const devModePath = path.join(projectRoot, "src", "scene", "dev-mode.js");

// Constants matching src/scene/world.js DEV_MODE block. Tests pass these in
// explicitly so the pure helpers stay decoupled from WORLD.
const C = Object.freeze({
  RUN_SPEED: 21,
  BACK_SPEED: 13.5,
  STRAFE_SPEED: 21,
  GRAVITY: 32,
  JUMP_VY: 17,
  EYE_HEIGHT: 4.86,
  MOUSE_SENSITIVITY: 0.005,
  PITCH_LIMIT: 1.55,
});

function createContext({ touchPrimary = false } = {}) {
  const window = {
    BabelSite: {},
    matchMedia: () => ({ matches: touchPrimary }),
    addEventListener() {},
  };
  const document = { addEventListener() {} };
  return { window, document };
}

async function loadDevMode(context) {
  const source = await readFile(devModePath, "utf8");
  vm.runInNewContext(
    source,
    {
      window: context.window,
      document: context.document,
      console,
      AbortController,
    },
    { filename: devModePath },
  );
  return context.window.BabelSite.scene.devMode;
}

test("dev-mode exposes pure helpers and starts inactive", async () => {
  const devMode = await loadDevMode(createContext());
  assert.equal(devMode.active, false);
  assert.equal(typeof devMode.attach, "function");
  assert.equal(typeof devMode.update, "function");
  assert.ok(devMode._test, "test helpers exposed");
  assert.equal(typeof devMode._test.buildGroundedVelocity, "function");
  assert.equal(typeof devMode._test.integrateMotion, "function");
  assert.equal(typeof devMode._test.applyGroundClamp, "function");
});

test("applyMouseDelta clamps pitch using the supplied limit", async () => {
  const { _test } = await loadDevMode(createContext());

  const small = _test.applyMouseDelta(0, 0, 100, 50, 0.005, 1.55);
  assert.equal(small.yaw, -0.5);
  assert.equal(small.pitch, -0.25);

  const upClamp = _test.applyMouseDelta(0, 0, 0, -10000, 0.005, 1.55);
  assert.ok(upClamp.pitch <= 1.55);
  assert.ok(upClamp.pitch >= 1.55 - 1e-6);

  const downClamp = _test.applyMouseDelta(0, 0, 0, 10000, 0.005, 1.55);
  assert.ok(downClamp.pitch >= -1.55);
  assert.ok(downClamp.pitch <= -1.55 + 1e-6);
});

test("buildGroundedVelocity returns zero with no input", async () => {
  const { _test } = await loadDevMode(createContext());
  const v = _test.buildGroundedVelocity(
    new Set(),
    0,
    C.RUN_SPEED,
    C.BACK_SPEED,
    C.STRAFE_SPEED,
    false,
  );
  assert.equal(v.x, 0);
  assert.equal(v.z, 0);
});

test("buildGroundedVelocity at yaw=0: W moves toward -Z, S moves slower toward +Z", async () => {
  const { _test } = await loadDevMode(createContext());

  const fwd = _test.buildGroundedVelocity(
    new Set(["KeyW"]),
    0,
    C.RUN_SPEED,
    C.BACK_SPEED,
    C.STRAFE_SPEED,
    false,
  );
  assert.ok(Math.abs(fwd.x) < 1e-9, `expected vx≈0, got ${fwd.x}`);
  assert.ok(Math.abs(fwd.z + C.RUN_SPEED) < 1e-9, `expected vz=-21, got ${fwd.z}`);

  const back = _test.buildGroundedVelocity(
    new Set(["KeyS"]),
    0,
    C.RUN_SPEED,
    C.BACK_SPEED,
    C.STRAFE_SPEED,
    false,
  );
  assert.ok(Math.abs(back.z - C.BACK_SPEED) < 1e-9, `expected vz=13.5, got ${back.z}`);
});

test("buildGroundedVelocity at yaw=0: A/Q move toward -X, D/E toward +X", async () => {
  const { _test } = await loadDevMode(createContext());

  const left = _test.buildGroundedVelocity(
    new Set(["KeyA"]),
    0,
    C.RUN_SPEED,
    C.BACK_SPEED,
    C.STRAFE_SPEED,
    false,
  );
  assert.ok(Math.abs(left.x + C.STRAFE_SPEED) < 1e-9);

  const right = _test.buildGroundedVelocity(
    new Set(["KeyD"]),
    0,
    C.RUN_SPEED,
    C.BACK_SPEED,
    C.STRAFE_SPEED,
    false,
  );
  assert.ok(Math.abs(right.x - C.STRAFE_SPEED) < 1e-9);

  const q = _test.buildGroundedVelocity(
    new Set(["KeyQ"]),
    0,
    C.RUN_SPEED,
    C.BACK_SPEED,
    C.STRAFE_SPEED,
    false,
  );
  assert.equal(q.x, left.x, "Q should alias A");

  const e = _test.buildGroundedVelocity(
    new Set(["KeyE"]),
    0,
    C.RUN_SPEED,
    C.BACK_SPEED,
    C.STRAFE_SPEED,
    false,
  );
  assert.equal(e.x, right.x, "E should alias D");
});

test("buildGroundedVelocity rotates with yaw: W at yaw=PI/2 moves toward -X", async () => {
  const { _test } = await loadDevMode(createContext());

  const v = _test.buildGroundedVelocity(
    new Set(["KeyW"]),
    Math.PI / 2,
    C.RUN_SPEED,
    C.BACK_SPEED,
    C.STRAFE_SPEED,
    false,
  );
  assert.ok(Math.abs(v.x + C.RUN_SPEED) < 1e-9, `vx should be -21, got ${v.x}`);
  assert.ok(Math.abs(v.z) < 1e-9, `vz should be ~0, got ${v.z}`);
});

test("buildGroundedVelocity clamps diagonal magnitude to RUN_SPEED", async () => {
  const { _test } = await loadDevMode(createContext());

  const diag = _test.buildGroundedVelocity(
    new Set(["KeyW", "KeyD"]),
    0,
    C.RUN_SPEED,
    C.BACK_SPEED,
    C.STRAFE_SPEED,
    false,
  );
  const mag = Math.hypot(diag.x, diag.z);
  assert.ok(Math.abs(mag - C.RUN_SPEED) < 1e-9, `diagonal magnitude should be RUN_SPEED, got ${mag}`);
});

test("buildGroundedVelocity treats W+S as zero (cancel)", async () => {
  const { _test } = await loadDevMode(createContext());

  const v = _test.buildGroundedVelocity(
    new Set(["KeyW", "KeyS"]),
    0,
    C.RUN_SPEED,
    C.BACK_SPEED,
    C.STRAFE_SPEED,
    false,
  );
  assert.equal(v.x, 0);
  assert.equal(v.z, 0);
});

test("buildGroundedVelocity: autoRun=true with no keys runs forward", async () => {
  const { _test } = await loadDevMode(createContext());

  const auto = _test.buildGroundedVelocity(
    new Set(),
    0,
    C.RUN_SPEED,
    C.BACK_SPEED,
    C.STRAFE_SPEED,
    true,
  );
  assert.ok(Math.abs(auto.z + C.RUN_SPEED) < 1e-9, "autoRun should forward at run speed");

  // Strafing while autoRun is on still produces a diagonal (forward + strafe).
  const autoStrafe = _test.buildGroundedVelocity(
    new Set(["KeyD"]),
    0,
    C.RUN_SPEED,
    C.BACK_SPEED,
    C.STRAFE_SPEED,
    true,
  );
  assert.ok(autoStrafe.z < 0, "still moving forward");
  assert.ok(autoStrafe.x > 0, "still strafing right");
  // Diagonal magnitude clamped to RUN_SPEED.
  const mag = Math.hypot(autoStrafe.x, autoStrafe.z);
  assert.ok(Math.abs(mag - C.RUN_SPEED) < 1e-9);
});

test("integrateMotion: grounded W key sets horizontal velocity, no Y change", async () => {
  const { _test } = await loadDevMode(createContext());
  const state = {
    position: { x: 0, y: 4.86, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    yaw: 0,
    grounded: true,
    groundY: 4.86,
  };
  const input = { keys: new Set(["KeyW"]), jumpRequested: false, autoRun: false };
  const out = _test.integrateMotion(state, input, 1 / 60, C);
  assert.ok(out.velocity.z < 0, "W should drive vz negative");
  assert.equal(out.velocity.y, 0, "no gravity while grounded");
  assert.equal(out.grounded, true);
  assert.equal(out.jumpConsumed, false);
});

test("integrateMotion: jump sets vy to JUMP_VY (minus one tick of gravity) and ungrounds", async () => {
  const { _test } = await loadDevMode(createContext());
  const state = {
    position: { x: 0, y: 4.86, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    yaw: 0,
    grounded: true,
    groundY: 4.86,
  };
  const dt = 1 / 60;
  const input = { keys: new Set(), jumpRequested: true, autoRun: false };
  const out = _test.integrateMotion(state, input, dt, C);
  // The jump fires, ungrounds, then the same frame's airborne branch takes one
  // tick of gravity off vy. Mirrors standing.'s LocalMovementController.
  const expected = C.JUMP_VY - C.GRAVITY * dt;
  assert.ok(
    Math.abs(out.velocity.y - expected) < 1e-9,
    `expected vy≈${expected}, got ${out.velocity.y}`,
  );
  assert.equal(out.grounded, false);
  assert.equal(out.jumpConsumed, true);
});

test("integrateMotion: airborne applies gravity, no air control on x/z", async () => {
  const { _test } = await loadDevMode(createContext());
  const state = {
    position: { x: 0, y: 10, z: 0 },
    velocity: { x: 5, y: 0, z: 0 },
    yaw: 0,
    grounded: false,
    groundY: 4.86,
  };
  // W key while airborne should NOT change vx/vz (no air control).
  const input = { keys: new Set(["KeyW"]), jumpRequested: false, autoRun: false };
  const dt = 1 / 60;
  const out = _test.integrateMotion(state, input, dt, C);
  assert.equal(out.velocity.x, 5, "vx persists in air");
  assert.equal(out.velocity.z, 0, "vz persists in air, ignoring W");
  assert.ok(Math.abs(out.velocity.y + C.GRAVITY * dt) < 1e-9, "gravity applied to vy");
});

test("integrateMotion: jump cannot fire mid-air", async () => {
  const { _test } = await loadDevMode(createContext());
  const state = {
    position: { x: 0, y: 10, z: 0 },
    velocity: { x: 0, y: 5, z: 0 },
    yaw: 0,
    grounded: false,
    groundY: 4.86,
  };
  const input = { keys: new Set(), jumpRequested: true, autoRun: false };
  const out = _test.integrateMotion(state, input, 1 / 60, C);
  assert.equal(out.jumpConsumed, false);
  // vy stays at 5 minus gravity (no jump impulse).
  assert.ok(out.velocity.y < 5, "no jump in air");
});

test("integrateMotion: self-recovery when grounded but Y too high", async () => {
  const { _test } = await loadDevMode(createContext());
  const state = {
    position: { x: 0, y: 10, z: 0 }, // way above groundY
    velocity: { x: 0, y: 0, z: 0 },
    yaw: 0,
    grounded: true, // claims grounded but isn't
    groundY: 4.86,
  };
  const input = { keys: new Set(), jumpRequested: false, autoRun: false };
  const out = _test.integrateMotion(state, input, 1 / 60, C);
  assert.equal(out.grounded, false, "self-recovers to airborne");
  assert.ok(out.velocity.y < 0, "gravity starts pulling down");
});

test("applyGroundClamp: snaps Y when at-or-below ground with non-positive vy", async () => {
  const { _test } = await loadDevMode(createContext());
  const state = {
    position: { x: 0, y: 4.0, z: 0 },
    velocity: { x: 5, y: -10, z: 3 },
    grounded: false,
  };
  const out = _test.applyGroundClamp(state, 4.86);
  assert.equal(out.position.y, 4.86);
  assert.equal(out.velocity.y, 0);
  assert.equal(out.grounded, true);
  // Horizontal velocity is preserved
  assert.equal(out.velocity.x, 5);
  assert.equal(out.velocity.z, 3);
});

test("applyGroundClamp: passes through when above ground or moving up", async () => {
  const { _test } = await loadDevMode(createContext());

  const above = {
    position: { x: 0, y: 10, z: 0 },
    velocity: { x: 0, y: -5, z: 0 },
    grounded: false,
  };
  assert.equal(_test.applyGroundClamp(above, 4.86), above, "above ground passes through");

  const ascending = {
    position: { x: 0, y: 4.0, z: 0 },
    velocity: { x: 0, y: 5, z: 0 }, // moving up
    grounded: false,
  };
  assert.equal(
    _test.applyGroundClamp(ascending, 4.86),
    ascending,
    "ascending pass-through even when below",
  );
});

test("getMode classifies movement state for the HUD", async () => {
  const { _test } = await loadDevMode(createContext());

  // Airborne always wins
  assert.equal(_test.getMode(new Set(["KeyW"]), false, false), "air");
  assert.equal(_test.getMode(new Set(), true, false), "air");

  // Grounded states from input
  assert.equal(_test.getMode(new Set(), false, true), "idle");
  assert.equal(_test.getMode(new Set(["KeyW"]), false, true), "run");
  assert.equal(_test.getMode(new Set(["KeyS"]), false, true), "back");
  assert.equal(_test.getMode(new Set(["KeyA"]), false, true), "strafe");
  assert.equal(_test.getMode(new Set(["KeyD"]), false, true), "strafe");
  assert.equal(_test.getMode(new Set(["KeyQ"]), false, true), "strafe", "Q is strafe");
  assert.equal(_test.getMode(new Set(["KeyE"]), false, true), "strafe", "E is strafe");

  // autoRun forces run when grounded with no key
  assert.equal(_test.getMode(new Set(), true, true), "run");
});

test("pickFirstOutlineable skips Sprite/Points/invisible objects", async () => {
  const { _test } = await loadDevMode(createContext());

  const mesh = { isMesh: true, visible: true };
  const sprite = { isSprite: true, visible: true };
  const points = { isPoints: true, visible: true };
  const hidden = { isMesh: true, visible: false };

  assert.equal(_test.pickFirstOutlineable([]), null);
  assert.equal(_test.pickFirstOutlineable(null), null);
  assert.equal(_test.pickFirstOutlineable([{ object: sprite }, { object: mesh }]), mesh);
  assert.equal(_test.pickFirstOutlineable([{ object: points }, { object: mesh }]), mesh);
  assert.equal(_test.pickFirstOutlineable([{ object: hidden }, { object: mesh }]), mesh);
  assert.equal(
    _test.pickFirstOutlineable([{ object: sprite }, { object: points }, { object: hidden }]),
    null,
  );
});

test("isFormTarget gates form fields and contenteditable surfaces", async () => {
  const { _test } = await loadDevMode(createContext());
  assert.equal(_test.isFormTarget(null), false);
  assert.equal(_test.isFormTarget({ tagName: "DIV" }), false);
  assert.equal(_test.isFormTarget({ tagName: "INPUT" }), true);
  assert.equal(_test.isFormTarget({ tagName: "TEXTAREA" }), true);
  assert.equal(_test.isFormTarget({ tagName: "SELECT" }), true);
  assert.equal(_test.isFormTarget({ tagName: "DIV", isContentEditable: true }), true);
});

test("isTouchDevice reports the matchMedia result", async () => {
  const desktop = await loadDevMode(createContext({ touchPrimary: false }));
  assert.equal(desktop._test.isTouchDevice(), false);

  const touch = await loadDevMode(createContext({ touchPrimary: true }));
  assert.equal(touch._test.isTouchDevice(), true);
});
