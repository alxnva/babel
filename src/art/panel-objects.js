// PARKED — not currently imported anywhere, so esbuild won't bundle it.
//
// Three.js panel-object scene: a low-poly notebook (About) and a folded
// letter (Contact). Originally rendered as the focal art behind each panel's
// text in the panel-frame-unification pass; that approach fought the text
// hierarchy, so the panels reverted to a flat parchment frame and these
// scenes were parked here pending a better stage to display them.
//
// To re-enable in the panels (the original wiring):
//   1. Add `import "../art/panel-objects.js";` to src/scene-entry.js so the
//      module attaches to window.BabelSite.scene.
//   2. Add a `.panel-object-stage` div inside each panel sheet in index.html,
//      with `data-panel-object="notebook"` or `data-panel-object="letter"`.
//   3. Call `site.scene.initPanelObjectArt()` once at scene boot, and
//      `site.scene.revealPanelObject(panelId)` when each panel opens
//      (formerly wired in src/ui/panels.js openPanel).
//
// To repurpose the assets elsewhere, the addNotebook/addLetter functions
// build their geometry into a passed-in THREE.Group — drop them into any
// scene that has a small viewport / camera ready to frame them.
import * as THREE from "three";

(() => {
  const site = (window.BabelSite = window.BabelSite || {});
  const sceneApi = (site.scene = site.scene || {});
  const instances = new Map();

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function setSrgbTexture(texture) {
    const srgbColorSpace = THREE.SRGBColorSpace;
    const srgbEncoding = THREE.sRGBEncoding;
    if (srgbColorSpace && "colorSpace" in texture) {
      texture.colorSpace = srgbColorSpace;
    } else if (srgbEncoding && "encoding" in texture) {
      texture.encoding = srgbEncoding;
    }
    return texture;
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
  }

  function makeTexture(kind) {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const fill = kind === "letter" ? "#ead9b8" : "#e8dcc2";
    const shade = kind === "letter" ? "#b99462" : "#a98a5a";
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const glow = ctx.createRadialGradient(190, 90, 12, 260, 160, 430);
    glow.addColorStop(0, "rgba(255, 250, 225, 0.68)");
    glow.addColorStop(0.58, "rgba(255, 250, 225, 0.05)");
    glow.addColorStop(1, "rgba(79, 55, 29, 0.18)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(69, 58, 43, 0.15)";
    ctx.lineWidth = 2;
    for (let yy = 96; yy < 440; yy += kind === "letter" ? 46 : 38) {
      ctx.beginPath();
      ctx.moveTo(64, yy);
      ctx.bezierCurveTo(230, yy - 8, 440, yy + 8, 704, yy - 3);
      ctx.stroke();
    }

      ctx.strokeStyle = kind === "letter" ? "rgba(49, 42, 35, 0.34)" : "rgba(49, 42, 35, 0.45)";
    ctx.lineCap = "round";
    ctx.lineWidth = 5;
    const strokes =
      kind === "letter"
        ? [
            [130, 184, 344, 158],
            [136, 230, 416, 200],
            [148, 276, 348, 258],
          ]
        : [
            [122, 150, 300, 136],
            [120, 196, 360, 176],
            [128, 242, 294, 234],
            [424, 162, 638, 186],
            [424, 212, 662, 232],
          ];
    strokes.forEach(([x1, y1, x2, y2], idx) => {
      ctx.lineWidth = idx % 2 === 0 ? 5 : 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo((x1 + x2) / 2, y1 + (idx % 2 ? 14 : -10), x2, y2);
      ctx.stroke();
    });

    for (let ii = 0; ii < 1500; ii += 1) {
      const alpha = 0.025 + Math.random() * 0.045;
      ctx.fillStyle = ii % 2 ? `rgba(255,255,245,${alpha})` : `rgba(78,57,35,${alpha})`;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
    }

    if (kind === "letter") {
      ctx.strokeStyle = "rgba(92, 68, 42, 0.22)";
      ctx.lineWidth = 3;
      [
        [372, 64, 356, 448],
        [248, 84, 214, 410],
        [520, 82, 562, 404],
      ].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(x1 - 14, 180, x2 + 18, 300, x2, y2);
        ctx.stroke();
      });
      ctx.fillStyle = "#b98a54";
      ctx.fillRect(570, 102, 58, 46);
      ctx.fillStyle = "#7b5836";
      ctx.fillRect(604, 128, 24, 20);
      ctx.fillStyle = "#7a4431";
      ctx.beginPath();
      ctx.arc(392, 312, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(238, 183, 131, 0.55)";
      ctx.beginPath();
      ctx.arc(378, 296, 18, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = shade;
      ctx.fillRect(666, 146, 48, 28);
      ctx.fillRect(650, 246, 42, 24);
    }

    const texture = setSrgbTexture(new THREE.CanvasTexture(canvas));
    texture.anisotropy = 2;
    return texture;
  }

  function material(color, options = {}) {
    return new THREE.MeshLambertMaterial({
      color,
      flatShading: true,
      transparent: options.transparent || false,
      opacity: options.opacity ?? 1,
      map: options.map || null,
      side: options.side || THREE.FrontSide,
    });
  }

  function plane(width, height, mat, position, rotation = [0, 0, 0]) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1, 1), mat);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    return mesh;
  }

  function box(width, height, depth, mat, position, rotation = [0, 0, 0]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth, 1, 1, 1), mat);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    return mesh;
  }

  function irregularPlane(points, mat) {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (let idx = 1; idx < points.length; idx += 1) shape.lineTo(points[idx][0], points[idx][1]);
    shape.closePath();
    return new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
  }

  function addNotebook(group) {
    const pageTexture = makeTexture("notebook");
    const coverMat = material("#363029");
    const coverShade = material("#25211d");
    const pageMat = material("#eadfc6", { map: pageTexture, side: THREE.DoubleSide });
    const edgeMat = material("#a68f68");
    const brassMat = material("#b58a55");
    const pencilMat = material("#8b6643");

    const shadow = plane(6.7, 1.0, material("#2a1b10", { transparent: true, opacity: 0.26 }), [0, -1.74, -0.28], [-1.2, 0, 0]);
    group.add(shadow);

    group.add(box(2.65, 3.0, 0.18, coverMat, [-1.34, 0.02, -0.16], [0.06, 0.34, 0.08]));
    group.add(box(2.65, 3.0, 0.18, coverShade, [1.34, 0.02, -0.16], [0.06, -0.34, -0.08]));
    group.add(box(0.28, 3.18, 0.22, material("#5d4b32"), [0, -0.02, -0.02], [0.06, 0, 0]));

    const leftPage = plane(2.58, 2.8, pageMat, [-1.22, 0.02, 0.06], [0.05, 0.2, 0.05]);
    const rightPage = plane(2.58, 2.8, pageMat, [1.22, 0.02, 0.06], [0.05, -0.2, -0.05]);
    leftPage.userData.finalY = 0.2;
    rightPage.userData.finalY = -0.2;
    group.add(leftPage, rightPage);

    group.add(box(2.48, 0.12, 0.12, edgeMat, [-1.23, -1.43, -0.02], [0.05, 0.2, 0.05]));
    group.add(box(2.48, 0.12, 0.12, edgeMat, [1.23, -1.43, -0.02], [0.05, -0.2, -0.05]));
    group.add(box(0.09, 2.45, 0.08, brassMat, [-2.35, 0.08, 0.05], [0.05, 0.18, 0.05]));
    group.add(box(0.42, 0.14, 0.08, brassMat, [2.44, 0.62, 0.12], [0.05, -0.2, -0.05]));
    group.add(box(0.36, 0.12, 0.08, brassMat, [2.34, -0.25, 0.12], [0.05, -0.2, -0.05]));
    group.add(box(0.12, 2.55, 0.08, pencilMat, [-0.28, 0.05, 0.2], [0.08, 0.08, 0.12]));

    group.userData.leftPage = leftPage;
    group.userData.rightPage = rightPage;
  }

  function addLetter(group) {
    const letterTexture = makeTexture("letter");
    const paperMat = material("#ead9b8", { map: letterTexture, side: THREE.DoubleSide });
    const shadeMat = material("#b99a6d", { transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const softShadeMat = material("#8d653d", { transparent: true, opacity: 0.18, side: THREE.DoubleSide });
    const shadow = plane(6.2, 1.0, material("#2a1b10", { transparent: true, opacity: 0.24 }), [0, -1.62, -0.26], [-1.2, 0, 0]);
    group.add(shadow);

    const letter = irregularPlane(
      [
        [-2.98, 1.2],
        [-1.72, 1.42],
        [-0.18, 1.3],
        [1.42, 1.46],
        [2.92, 1.12],
        [2.72, -1.18],
        [1.38, -1.42],
        [-0.1, -1.28],
        [-1.68, -1.46],
        [-2.86, -1.1],
      ],
      paperMat,
    );
    letter.rotation.set(0.06, -0.1, -0.04);
    group.add(letter);

    const corner = irregularPlane(
      [
        [1.85, 1.26],
        [2.92, 1.12],
        [2.62, 0.42],
        [1.72, 0.78],
      ],
      shadeMat,
    );
    corner.position.z = 0.08;
    corner.rotation.set(0.08, -0.18, -0.04);
    group.add(corner);

    const leftFold = plane(1.05, 2.42, softShadeMat, [-1.52, -0.03, 0.09], [0.08, -0.22, -0.04]);
    leftFold.scale.x = 0.75;
    const centerFold = plane(0.16, 2.62, material("#8d653d", { transparent: true, opacity: 0.12, side: THREE.DoubleSide }), [0.04, 0, 0.1], [0.08, -0.04, -0.04]);
    const rightLift = plane(1.1, 2.35, material("#fff0c8", { transparent: true, opacity: 0.16, side: THREE.DoubleSide }), [1.42, 0.02, 0.11], [0.08, 0.18, -0.04]);
    group.add(leftFold, centerFold, rightLift);

    group.add(box(0.55, 0.42, 0.06, material("#b98a54"), [1.78, 0.72, 0.14], [0.05, -0.08, -0.04]));
    group.add(box(0.22, 0.2, 0.07, material("#7b5836"), [1.93, 0.58, 0.18], [0.05, -0.08, -0.04]));
    group.add(
      plane(0.72, 0.72, material("#7a4431", { transparent: true, opacity: 0.94 }), [0.08, -0.5, 0.16], [0.08, -0.08, -0.04]),
    );

    group.userData.letter = letter;
    group.userData.corner = corner;
  }

  class PanelObject {
    constructor(stage) {
      this.stage = stage;
      this.kind = stage.dataset.panelObject;
      this.scene = new THREE.Scene();
      this.camera = new THREE.OrthographicCamera(-4, 4, 2.4, -2.4, 0.1, 30);
      this.camera.position.set(0, 0, 10);
      this.group = new THREE.Group();
      this.scene.add(this.group);
      this.scene.add(new THREE.AmbientLight(0xf1dfbd, 2.4));
      const light = new THREE.DirectionalLight(0xffe2b4, 2.8);
      light.position.set(-2.5, 4.5, 7);
      this.scene.add(light);

      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      stage.appendChild(this.renderer.domElement);

      if (this.kind === "letter") addLetter(this.group);
      else addNotebook(this.group);
      this.group.rotation.x = -0.42;
      this.group.rotation.z = this.kind === "letter" ? -0.04 : 0.02;
      this.group.scale.setScalar(1);

      if (typeof ResizeObserver === "function") {
        this.resizeObserver = new ResizeObserver(() => this.renderFinal());
        this.resizeObserver.observe(stage);
      } else {
        window.addEventListener("resize", () => this.renderFinal(), { passive: true });
      }
      this.renderFinal();
    }

    resize() {
      const rect = this.stage.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width || 720));
      const height = Math.max(1, Math.round(rect.height || 430));
      const aspect = width / height;
      const viewHeight = aspect < 0.9 ? 5.4 : 4.6;
      this.camera.left = (-viewHeight * aspect) / 2;
      this.camera.right = (viewHeight * aspect) / 2;
      this.camera.top = viewHeight / 2;
      this.camera.bottom = -viewHeight / 2;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }

    applyReveal(progress) {
      const tt = easeOutCubic(progress);
      this.group.position.y = (1 - tt) * -0.24;
      this.group.rotation.x = this.kind === "letter" ? -0.34 + tt * 0.22 : -0.72 + tt * 0.3;
      this.group.scale.y = this.kind === "letter" ? 0.52 + tt * 0.48 : 0.68 + tt * 0.32;
      this.group.scale.x = this.kind === "letter" ? 0.86 + tt * 0.14 : 0.92 + tt * 0.08;

      const leftPage = this.group.userData.leftPage;
      const rightPage = this.group.userData.rightPage;
      if (leftPage && rightPage) {
        leftPage.rotation.y = 0.72 - tt * 0.52;
        rightPage.rotation.y = -0.72 + tt * 0.52;
      }
      const letter = this.group.userData.letter;
      const corner = this.group.userData.corner;
      if (letter && corner) {
        letter.rotation.x = 0.42 - tt * 0.36;
        corner.rotation.y = -0.72 + tt * 0.54;
      }
    }

    renderFinal() {
      this.applyReveal(1);
      this.resize();
      this.renderer.render(this.scene, this.camera);
    }

    play() {
      this.resize();
      if (prefersReducedMotion()) {
        this.renderFinal();
        return;
      }
      const start = performance.now();
      const duration = this.kind === "letter" ? 680 : 620;
      const draw = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        this.applyReveal(progress);
        this.renderer.render(this.scene, this.camera);
        if (progress < 1) requestAnimationFrame(draw);
      };
      requestAnimationFrame(draw);
    }
  }

  function getStageForPanel(panelId) {
    return document.querySelector(`#panel-${panelId} .panel-object-stage`);
  }

  function ensureInstance(stage) {
    if (!stage) return null;
    if (instances.has(stage)) return instances.get(stage);
    try {
      const instance = new PanelObject(stage);
      instances.set(stage, instance);
      stage.closest(".panel-parchment")?.classList.remove("panel-object-fallback");
      return instance;
    } catch (error) {
      console.warn("Panel object art failed to initialize.", error);
      stage.closest(".panel-parchment")?.classList.add("panel-object-fallback");
      return null;
    }
  }

  sceneApi.initPanelObjectArt = function initPanelObjectArt() {
    document.querySelectorAll(".panel-object-stage").forEach((stage) => ensureInstance(stage));
  };

  sceneApi.revealPanelObject = function revealPanelObject(panelId) {
    const instance = ensureInstance(getStageForPanel(panelId));
    if (instance) instance.play();
  };
})();
