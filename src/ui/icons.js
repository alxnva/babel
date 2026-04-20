(() => {
  const site = (window.BabelSite = window.BabelSite || {});
  const ui = (site.ui = site.ui || {});

  // Fills a closed polygon defined by an array of [x, y] points. Coordinates
  // are pixel-snapped so edges stay crisp — part of the PS1/PS2 low-poly look
  // (hard edges, no sub-pixel shimmer).
  function fillPoly(ctx, color, points) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(Math.round(points[0][0]), Math.round(points[0][1]));
    for (let idx = 1; idx < points.length; idx += 1) {
      ctx.lineTo(Math.round(points[idx][0]), Math.round(points[idx][1]));
    }
    ctx.closePath();
    ctx.fill();
  }

  const DITHER_4X4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    return {
      r: Number.parseInt(value.slice(0, 2), 16),
      g: Number.parseInt(value.slice(2, 4), 16),
      b: Number.parseInt(value.slice(4, 6), 16),
    };
  }

  function nearestPaletteColor(r, g, b, palette) {
    let best = palette[0];
    let bestScore = Number.POSITIVE_INFINITY;
    for (let idx = 0; idx < palette.length; idx += 1) {
      const entry = palette[idx];
      const dr = r - entry.r;
      const dg = g - entry.g;
      const db = b - entry.b;
      const score = dr * dr + dg * dg + db * db;
      if (score < bestScore) {
        bestScore = score;
        best = entry;
      }
    }
    return best;
  }

  function applyPsxDither(ctx, x, y, w, h, palette, ditherStrength = 28, blockSize = 1) {
    const px = Math.max(0, Math.floor(x));
    const py = Math.max(0, Math.floor(y));
    const pw = Math.max(1, Math.ceil(w));
    const ph = Math.max(1, Math.ceil(h));
    const image = ctx.getImageData(px, py, pw, ph);
    const data = image.data;
    const strength = ditherStrength / 16;

    const step = Math.max(1, blockSize);
    for (let row = 0; row < ph; row += step) {
      for (let col = 0; col < pw; col += step) {
        const ptr = (row * pw + col) * 4;
        const alpha = data[ptr + 3];
        if (alpha < 8) {
          continue;
        }

        const dither = DITHER_4X4[(row & 3) * 4 + (col & 3)] - 7.5;
        const rr = Math.min(255, Math.max(0, data[ptr] + dither * strength));
        const gg = Math.min(255, Math.max(0, data[ptr + 1] + dither * strength));
        const bb = Math.min(255, Math.max(0, data[ptr + 2] + dither * strength));
        const nearest = nearestPaletteColor(rr, gg, bb, palette);

        for (let yOff = 0; yOff < step; yOff += 1) {
          for (let xOff = 0; xOff < step; xOff += 1) {
            const yy = row + yOff;
            const xx = col + xOff;
            if (yy >= ph || xx >= pw) {
              continue;
            }
            const outPtr = (yy * pw + xx) * 4;
            if (data[outPtr + 3] < 8) {
              continue;
            }
            data[outPtr] = nearest.r;
            data[outPtr + 1] = nearest.g;
            data[outPtr + 2] = nearest.b;
          }
        }
      }
    }

    ctx.putImageData(image, px, py);
  }

  // Low-poly closed book viewed from a slight 3/4 angle above.
  // Four visible faces: top cover (largest), right page-edge, front
  // page-edge, and a title band — flat-shaded, pixel-snapped, PS-era.
  function drawNotebook(ctx, width, height, active) {
    const scale = width / 88;
    const px = (nn) => nn * scale;

    const palette = [
      "#d3cab8", "#b89c7a", "#6d685f", "#4a4540",
      "#36322b", "#2e2a24", "#211e19",
    ].map(hexToRgb);

    const cover = active ? "#524c45" : "#46413c";
    const coverTop = active ? "#5d574f" : "#504a44";
    const pages = active ? "#dfd5c2" : "#d3cab8";
    const pagesShade = active ? "#baae9a" : "#a89d8a";
    const spine = active ? "#33302c" : "#2a2724";
    const title = active ? "#c8ae8b" : "#b89c7a";
    const titleShade = active ? "#8f785a" : "#7d684d";

    // Ambient glow beneath — keeps the icon seated in the bar.
    const glow = ctx.createRadialGradient(px(44), px(48), 0, px(44), px(48), px(40));
    glow.addColorStop(0, active ? "rgba(128,122,110,0.28)" : "rgba(108,102,92,0.16)");
    glow.addColorStop(1, "rgba(70,64,56,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Front page-edge (thin strip visible below the cover).
    fillPoly(ctx, pages, [
      [px(24), px(58)], [px(64), px(52)],
      [px(70), px(56)], [px(30), px(62)],
    ]);
    // A darker sliver on the underside of the page stack so the
    // thickness reads as a 3D wedge, not a flat line.
    fillPoly(ctx, pagesShade, [
      [px(30), px(62)], [px(70), px(56)],
      [px(68), px(60)], [px(32), px(65)],
    ]);

    // Right page-edge (thin strip visible beside the cover).
    fillPoly(ctx, pages, [
      [px(58), px(18)], [px(62), px(22)],
      [px(70), px(56)], [px(64), px(52)],
    ]);

    // Top cover — primary face.
    fillPoly(ctx, cover, [
      [px(20), px(22)], [px(58), px(18)],
      [px(64), px(52)], [px(24), px(58)],
    ]);
    // Upper sliver of the cover catches a little more light — gives
    // the flat face a hint of form without a gradient.
    fillPoly(ctx, coverTop, [
      [px(20), px(22)], [px(58), px(18)],
      [px(60), px(26)], [px(22), px(30)],
    ]);

    // Spine-side dark edge where the binding rolls over.
    fillPoly(ctx, spine, [
      [px(20), px(22)], [px(24), px(58)],
      [px(27), px(58)], [px(23), px(22)],
    ]);

    // Title band — the icon's single accent element.
    fillPoly(ctx, title, [
      [px(28), px(34)], [px(50), px(30)],
      [px(52), px(40)], [px(30), px(44)],
    ]);
    // Shaded underside of the title band, same trick as the cover.
    fillPoly(ctx, titleShade, [
      [px(30), px(44)], [px(52), px(40)],
      [px(52), px(42)], [px(30), px(46)],
    ]);

    // Gold-tooled decorative band across the lower cover — classic
    // hardcover embellishment. Two pixel-thin parallelograms sloped to
    // match the cover's tilt.
    fillPoly(ctx, titleShade, [
      [px(26), px(50)], [px(60), px(46)],
      [px(60), px(48)], [px(26), px(52)],
    ]);
    fillPoly(ctx, titleShade, [
      [px(26), px(54)], [px(60), px(50)],
      [px(60), px(51)], [px(26), px(55)],
    ]);

    applyPsxDither(
      ctx,
      px(14), px(14),
      px(62), px(56),
      palette,
      active ? 10 : 7,
      2,
    );
  }

  // Low-poly envelope, front view. A single rectangular body with the flap
  // crease drawn inside as a V (two color-contrasted triangles), plus a
  // small stamp in the corner. Same polygon vocabulary as the notebook so
  // the pair reads as one icon family.
  function drawEnvelope(ctx, width, height, active) {
    const scale = width / 88;
    const px = (nn) => nn * scale;

    const palette = [
      "#e4dccf", "#c9c1b2", "#a89f91", "#807868",
      "#b89c7a", "#6d655a", "#3a342e",
    ].map(hexToRgb);

    const bodyLight = active ? "#e4dccf" : "#d9d1c3";
    const bodyShade = active ? "#c9c1b2" : "#bdb5a6";
    const flapLight = active ? "#e8e0d2" : "#dcd3c4";
    const flapShade = active ? "#b6aea0" : "#a89f91";
    const creaseLine = active ? "rgba(64,58,50,0.7)" : "rgba(64,58,50,0.55)";
    const edgeLine = active ? "rgba(64,58,50,0.5)" : "rgba(64,58,50,0.38)";
    const stampFill = active ? "#c8ae8b" : "#b89c7a";
    const stampShade = active ? "#8f785a" : "#7d684d";

    // Ambient glow — consistent with the notebook.
    const glow = ctx.createRadialGradient(px(44), px(46), 0, px(44), px(46), px(40));
    glow.addColorStop(0, active ? "rgba(128,122,110,0.26)" : "rgba(108,102,92,0.14)");
    glow.addColorStop(1, "rgba(70,64,56,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // BODY — the full envelope rectangle. Everything else sits on top.
    fillPoly(ctx, bodyLight, [
      [px(14), px(30)], [px(74), px(30)],
      [px(74), px(62)], [px(14), px(62)],
    ]);
    // Bottom shade band so the flat body has a subtle ground plane.
    fillPoly(ctx, bodyShade, [
      [px(14), px(58)], [px(74), px(58)],
      [px(74), px(62)], [px(14), px(62)],
    ]);

    // FLAP CREASE — two triangles meeting at a point below center that
    // together form the classic "V" you see on the front of a sealed
    // envelope. Left is lit; right is the shaded back-of-fold.
    fillPoly(ctx, flapLight, [
      [px(14), px(30)], [px(44), px(30)],
      [px(44), px(48)],
    ]);
    fillPoly(ctx, flapShade, [
      [px(44), px(30)], [px(74), px(30)],
      [px(44), px(48)],
    ]);

    // Crease stroke down the center fold.
    ctx.strokeStyle = creaseLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(px(44)), Math.round(px(30)));
    ctx.lineTo(Math.round(px(44)), Math.round(px(48)));
    ctx.stroke();

    // Envelope outline — a pixel-thin border around the rectangle so the
    // body edge doesn't dissolve into the glow at a glance.
    ctx.strokeStyle = edgeLine;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.round(px(14)) + 0.5,
      Math.round(px(30)) + 0.5,
      Math.round(px(60)),
      Math.round(px(32)),
    );

    // STAMP — small brass square tucked into the top-right corner of
    // the body. Two-tone bevel matches the notebook's title-band style.
    fillPoly(ctx, stampFill, [
      [px(62), px(34)], [px(70), px(34)],
      [px(70), px(42)], [px(62), px(42)],
    ]);
    fillPoly(ctx, stampShade, [
      [px(66), px(38)], [px(70), px(38)],
      [px(70), px(42)], [px(66), px(42)],
    ]);

    applyPsxDither(
      ctx,
      px(12), px(26),
      px(64), px(40),
      palette,
      active ? 10 : 7,
      2,
    );
  }

  function bindCanvas(canvas, drawFn) {
    const button = canvas.closest(".bottom-btn");
    if (!button) {
      return () => {};
    }

    let active = false;
    let lastDrawSignature = "";
    const bitmapCache = new Map();

    function getCachedBitmap(width, height, pixelWidth, pixelHeight, dpr, isActive) {
      const key = `${pixelWidth}:${pixelHeight}:${isActive ? 1 : 0}`;
      const cached = bitmapCache.get(key);
      if (cached) return cached;
      const off = document.createElement("canvas");
      off.width = pixelWidth;
      off.height = pixelHeight;
      const octx = off.getContext("2d");
      if (!octx) return null;
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      octx.clearRect(0, 0, width, height);
      drawFn(octx, width, height, isActive);
      bitmapCache.set(key, off);
      return off;
    }

    function render() {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 72;
      const height = rect.height || 72;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.max(1, Math.round(width * dpr));
      const pixelHeight = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      const drawSignature = `${pixelWidth}:${pixelHeight}:${active ? 1 : 0}`;
      if (drawSignature === lastDrawSignature) {
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      const bitmap = getCachedBitmap(width, height, pixelWidth, pixelHeight, dpr, active);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, pixelWidth, pixelHeight);
      if (bitmap) {
        ctx.drawImage(bitmap, 0, 0);
      } else {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawFn(ctx, width, height, active);
      }

      lastDrawSignature = drawSignature;
    }

    button.addEventListener("mouseenter", () => {
      active = true;
      render();
    });
    button.addEventListener("mouseleave", () => {
      active = false;
      render();
    });
    button.addEventListener("focus", () => {
      active = true;
      render();
    });
    button.addEventListener("blur", () => {
      active = false;
      render();
    });

    return render;
  }

  const HOLY_FIRE_PROC_CHANCE = 0.35;
  const HOLY_FIRE_DURATION_MS = 1300;
  const HOLY_FIRE_OVERLAY_PAD = 44;

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function spawnHolyFireProc(button) {
    if (button.dataset.holyFireActive === "1") {
      return;
    }
    button.dataset.holyFireActive = "1";

    const buttonRect = button.getBoundingClientRect();
    const buttonW = buttonRect.width || 88;
    const buttonH = buttonRect.height || 88;
    const overlayW = buttonW + HOLY_FIRE_OVERLAY_PAD * 2;
    const overlayH = buttonH + HOLY_FIRE_OVERLAY_PAD * 2;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const overlay = document.createElement("canvas");
    overlay.className = "holy-fire-proc";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.position = "absolute";
    overlay.style.left = `-${HOLY_FIRE_OVERLAY_PAD}px`;
    overlay.style.top = `-${HOLY_FIRE_OVERLAY_PAD}px`;
    overlay.style.width = `${overlayW}px`;
    overlay.style.height = `${overlayH}px`;
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "2";
    overlay.width = Math.round(overlayW * dpr);
    overlay.height = Math.round(overlayH * dpr);
    button.appendChild(overlay);

    const ctx = overlay.getContext("2d");
    if (!ctx) {
      overlay.remove();
      button.dataset.holyFireActive = "0";
      return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const innerSize = Math.min(buttonW, buttonH) * 0.78;
    const innerX = (overlayW - innerSize) / 2;
    const innerY = (overlayH - innerSize) / 2;
    const innerR = innerSize * 0.16;
    const cx = overlayW / 2;
    const cy = overlayH / 2;

    const flames = [];

    function pickPerimeterPoint() {
      const side = Math.floor(Math.random() * 4);
      const along = Math.random();
      if (side === 0) {
        return { px: innerX + along * innerSize, py: innerY, nx: 0, ny: -1 };
      }
      if (side === 1) {
        return { px: innerX + innerSize, py: innerY + along * innerSize, nx: 1, ny: 0 };
      }
      if (side === 2) {
        return { px: innerX + along * innerSize, py: innerY + innerSize, nx: 0, ny: 1 };
      }
      return { px: innerX, py: innerY + along * innerSize, nx: -1, ny: 0 };
    }

    function spawnFlame() {
      const seed = pickPerimeterPoint();
      flames.push({
        px: seed.px,
        py: seed.py,
        vx: seed.nx * (0.35 + Math.random() * 0.55),
        vy: seed.ny * (0.25 + Math.random() * 0.45) - 0.55,
        age: 0,
        life: 600 + Math.random() * 350,
        size: 4.5 + Math.random() * 5.5,
      });
    }

    for (let idx = 0; idx < 16; idx += 1) {
      spawnFlame();
    }

    const startTime = performance.now();
    let lastFrame = startTime;

    function drawFrame(now) {
      const elapsed = now - startTime;
      const dt = Math.min(40, now - lastFrame);
      lastFrame = now;

      if (elapsed > HOLY_FIRE_DURATION_MS) {
        overlay.remove();
        button.dataset.holyFireActive = "0";
        return;
      }

      const spawnIntensity = Math.max(0, 1 - elapsed / HOLY_FIRE_DURATION_MS);
      if (Math.random() < spawnIntensity * 0.85) {
        spawnFlame();
        if (Math.random() < 0.55) {
          spawnFlame();
        }
      }

      let envelope;
      const fadeInMs = 120;
      const fadeOutMs = 360;
      if (elapsed < fadeInMs) {
        envelope = elapsed / fadeInMs;
      } else if (elapsed < HOLY_FIRE_DURATION_MS - fadeOutMs) {
        envelope = 1;
      } else {
        envelope = Math.max(0, 1 - (elapsed - (HOLY_FIRE_DURATION_MS - fadeOutMs)) / fadeOutMs);
      }

      ctx.clearRect(0, 0, overlayW, overlayH);

      const haloPulse = 1 + 0.09 * Math.sin(elapsed * 0.012);
      const haloOuter = innerSize * 0.95 * haloPulse;
      const haloInner = innerSize * 0.38;
      const halo = ctx.createRadialGradient(cx, cy, haloInner, cx, cy, haloOuter);
      halo.addColorStop(0, `rgba(255, 234, 170, ${0.4 * envelope})`);
      halo.addColorStop(0.55, `rgba(255, 198, 110, ${0.24 * envelope})`);
      halo.addColorStop(1, "rgba(255, 160, 60, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, overlayW, overlayH);

      ctx.save();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = `rgba(255, 224, 150, ${0.85 * envelope})`;
      ctx.shadowColor = `rgba(255, 200, 110, ${0.95 * envelope})`;
      ctx.shadowBlur = 18;
      roundedRectPath(ctx, innerX, innerY, innerSize, innerSize, innerR);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(255, 252, 235, ${0.72 * envelope})`;
      ctx.shadowBlur = 6;
      roundedRectPath(ctx, innerX, innerY, innerSize, innerSize, innerR);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let idx = flames.length - 1; idx >= 0; idx -= 1) {
        const flame = flames[idx];
        flame.age += dt;
        if (flame.age >= flame.life) {
          flames.splice(idx, 1);
          continue;
        }
        const step = dt * 0.06;
        flame.px += flame.vx * step;
        flame.py += flame.vy * step;
        flame.vy -= 0.012 * step;

        const lifeT = flame.age / flame.life;
        const alpha = (1 - lifeT) * envelope;
        const size = flame.size * (1 - lifeT * 0.55);

        ctx.fillStyle = `rgba(220, 80, 30, ${alpha * 0.42})`;
        ctx.beginPath();
        ctx.arc(flame.px, flame.py, size * 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 140, 50, ${alpha * 0.68})`;
        ctx.beginPath();
        ctx.arc(flame.px, flame.py, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 240, 200, ${alpha * 0.95})`;
        ctx.beginPath();
        ctx.arc(flame.px, flame.py, size * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      requestAnimationFrame(drawFrame);
    }
    requestAnimationFrame(drawFrame);
  }

  function bindHolyFireProc(button) {
    button.addEventListener("click", () => {
      if (prefersReducedMotion()) {
        return;
      }
      if (Math.random() < HOLY_FIRE_PROC_CHANCE) {
        spawnHolyFireProc(button);
      }
    });
  }

  ui.initBottomNavIcons = function initBottomNavIcons() {
    const aboutCanvas = document.getElementById("btn-icon-about");
    const contactCanvas = document.getElementById("btn-icon-contact");
    if (!aboutCanvas || !contactCanvas) {
      return;
    }

    const renderers = [
      bindCanvas(aboutCanvas, drawNotebook),
      bindCanvas(contactCanvas, drawEnvelope),
    ];

    [aboutCanvas, contactCanvas].forEach((canvas) => {
      const button = canvas.closest(".bottom-btn");
      if (button) {
        bindHolyFireProc(button);
      }
    });

    renderers.forEach((render) => render());
    let rerenderScheduled = false;
    const rerenderAll = () => {
      renderers.forEach((render) => render());
    };
    const scheduleRerenderAll = () => {
      if (rerenderScheduled) {
        return;
      }
      rerenderScheduled = true;
      requestAnimationFrame(() => {
        rerenderScheduled = false;
        rerenderAll();
      });
    };
    window.addEventListener("resize", scheduleRerenderAll, { passive: true });
  };
})();
