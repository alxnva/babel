import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");
const iconsSourcePath = path.join(projectRoot, "src", "ui", "icons.js");
const colorSourcePath = path.join(projectRoot, "src", "shared", "color.js");

class FakeCanvasContext {
  setTransform() {}
  clearRect() {}
  drawImage() {}
  fillRect() {}
  putImageData() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  quadraticCurveTo() {}
  closePath() {}
  fill() {}
  stroke() {}
  strokeRect() {}
  arc() {}
  save() {}
  restore() {}

  createRadialGradient() {
    return { addColorStop() {} };
  }

  getImageData(_x, _y, width, height) {
    return { data: new Uint8ClampedArray(Math.max(1, width * height * 4)) };
  }
}

class FakeButton {
  constructor() {
    this.children = [];
    this.dataset = {};
    this.listeners = new Map();
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  dispatchEvent(event) {
    event.target ||= this;
    const handlers = this.listeners.get(event.type) || [];
    for (const handler of handlers) handler.call(this, event);
  }

  getBoundingClientRect() {
    return { width: 88, height: 88 };
  }
}

class FakeCanvas {
  constructor(button = null) {
    this.button = button;
    this.className = "";
    this.dataset = {};
    this.height = 0;
    this.parentNode = null;
    this.style = {};
    this.width = 0;
  }

  closest(selector) {
    return selector === ".bottom-btn" ? this.button : null;
  }

  getAttribute() {
    return null;
  }

  getBoundingClientRect() {
    return { width: 88, height: 88 };
  }

  getContext(type) {
    return type === "2d" ? new FakeCanvasContext() : null;
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  setAttribute(name, value) {
    this[name] = value;
  }
}

test("bottom nav icons initialize without random click effects", async () => {
  const source = await readFile(iconsSourcePath, "utf8");
  const colorSource = await readFile(colorSourcePath, "utf8");
  const aboutButton = new FakeButton();
  const contactButton = new FakeButton();
  const aboutCanvas = new FakeCanvas(aboutButton);
  const contactCanvas = new FakeCanvas(contactButton);

  const document = {
    createElement(tagName) {
      assert.equal(tagName, "canvas");
      return new FakeCanvas();
    },
    getElementById(id) {
      if (id === "btn-icon-about") return aboutCanvas;
      if (id === "btn-icon-contact") return contactCanvas;
      return null;
    },
  };

  const window = {
    BabelSite: {},
    devicePixelRatio: 1,
    matchMedia() {
      return { matches: false };
    },
    addEventListener() {},
    requestAnimationFrame() {},
  };

  const sharedContext = {
    window,
    document,
    console,
    requestAnimationFrame: window.requestAnimationFrame,
    Uint8ClampedArray,
  };
  vm.runInNewContext(colorSource, sharedContext, { filename: colorSourcePath });
  vm.runInNewContext(source, sharedContext, { filename: iconsSourcePath });

  window.BabelSite.ui.initBottomNavIcons();

  assert.doesNotThrow(() => aboutButton.dispatchEvent({ type: "click" }));
  assert.equal(aboutButton.listeners.has("click"), false);
  assert.equal(contactButton.listeners.has("click"), false);
  assert.equal(aboutButton.children.length, 0);
  assert.equal(contactButton.children.length, 0);
  assert.doesNotMatch(source, /holy-fire|HOLY_FIRE|Math\.random/);
});
