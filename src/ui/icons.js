(() => {
  const site = (window.BabelSite = window.BabelSite || {});
  const ui = (site.ui = site.ui || {});

  function roundedRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
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

  function drawNotebook(ctx, width, height, active) {
    const x = width * 0.31;
    const y = height * 0.2;
    const w = width * 0.38;
    const h = height * 0.58;
    const spineW = w * 0.24;
    const palette = [
      "#857d73",
      "#726f66",
      "#5f5a55",
      "#534936",
      "#4c4534",
      "#48402d",
      "#453d2a",
      "#3b3524",
      "#342e20",
      "#322b1d",
    ].map(hexToRgb);

    const glow = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      0,
      width * 0.5,
      height * 0.5,
      width * 0.3,
    );
    glow.addColorStop(0, active ? "rgba(134, 129, 120, 0.34)" : "rgba(118, 112, 103, 0.2)");
    glow.addColorStop(1, "rgba(92, 84, 70, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    roundedRectPath(ctx, x, y, w, h, width * 0.05);
    ctx.fillStyle = "#453d2a";
    ctx.fill();

    ctx.fillStyle = "#342e20";
    roundedRectPath(ctx, x, y, spineW, h, width * 0.04);
    ctx.fill();

    ctx.fillStyle = "rgba(130, 124, 113, 0.22)";
    roundedRectPath(
      ctx,
      x + spineW,
      y + height * 0.01,
      w - spineW - width * 0.01,
      h * 0.28,
      width * 0.03,
    );
    ctx.fill();

    ctx.fillStyle = "rgba(60, 52, 40, 0.52)";
    ctx.fillRect(x + spineW + width * 0.02, y + h * 0.53, w - spineW - width * 0.07, h * 0.42);

    ctx.fillStyle = "rgba(80, 69, 52, 0.45)";
    for (let idx = 0; idx < 5; idx += 1) {
      const bandY = y + h * (0.15 + idx * 0.16);
      ctx.fillRect(x + spineW + width * 0.01, bandY, w - spineW - width * 0.03, height * 0.015);
    }

    ctx.strokeStyle = active ? "rgba(152, 145, 134, 0.82)" : "rgba(129, 123, 112, 0.58)";
    ctx.lineWidth = 1.1;
    roundedRectPath(ctx, x, y, w, h, width * 0.05);
    ctx.stroke();

    ctx.strokeStyle = "rgba(88, 74, 55, 0.68)";
    ctx.lineWidth = 1;
    for (let idx = 0; idx < 4; idx += 1) {
      const yy = y + h * (0.2 + idx * 0.18);
      ctx.beginPath();
      ctx.moveTo(x + spineW + width * 0.03, yy);
      ctx.lineTo(x + w - width * 0.04, yy - height * 0.03);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(129, 123, 112, 0.9)";
    for (let idx = 0; idx < 4; idx += 1) {
      const ringY = y + h * (0.17 + idx * 0.19);
      ctx.beginPath();
      ctx.arc(x + spineW * 0.48, ringY, width * 0.012, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(136, 128, 116, 0.48)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x + spineW + width * 0.02, y + h - height * 0.03);
    ctx.lineTo(x + w - width * 0.02, y + h - height * 0.06);
    ctx.stroke();

    ctx.fillStyle = "#726f66";
    ctx.fillRect(width * 0.49, y + h + height * 0.02, width * 0.02, height * 0.12);

    applyPsxDither(
      ctx,
      x - width * 0.02,
      y - height * 0.02,
      w + width * 0.05,
      h + height * 0.18,
      palette,
      active ? 34 : 30,
      2,
    );
  }

  function drawLetter(ctx, width, height, active) {
    const x = width * 0.29;
    const y = height * 0.23;
    const w = width * 0.42;
    const h = height * 0.52;
    const palette = [
      "#939393",
      "#726f66",
      "#5f5a55",
      "#584b39",
      "#544836",
      "#4d4131",
      "#493e30",
      "#45392a",
      "#3c3224",
      "#352a1c",
    ].map(hexToRgb);

    const glow = ctx.createRadialGradient(
      width * 0.52,
      height * 0.46,
      0,
      width * 0.52,
      height * 0.46,
      width * 0.34,
    );
    glow.addColorStop(0, active ? "rgba(118, 112, 100, 0.34)" : "rgba(102, 96, 86, 0.2)");
    glow.addColorStop(1, "rgba(84, 74, 60, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    roundedRectPath(ctx, x, y, w, h, width * 0.03);
    ctx.fillStyle = "#5f5a55";
    ctx.fill();

    ctx.fillStyle = "rgba(62, 51, 37, 0.3)";
    ctx.fillRect(x + w * 0.04, y + h * 0.5, w * 0.92, h * 0.45);

    ctx.fillStyle = "rgba(145, 145, 145, 0.5)";
    ctx.beginPath();
    ctx.moveTo(x + w * 0.74, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h * 0.26);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(83, 70, 53, 0.24)";
    ctx.beginPath();
    ctx.moveTo(x + w * 0.74, y);
    ctx.lineTo(x + w * 0.74, y + h * 0.26);
    ctx.lineTo(x + w, y + h * 0.26);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = active ? "rgba(151, 151, 151, 0.9)" : "rgba(121, 119, 112, 0.66)";
    ctx.lineWidth = 1.1;
    roundedRectPath(ctx, x, y, w, h, width * 0.03);
    ctx.stroke();

    ctx.strokeStyle = "rgba(67, 55, 42, 0.78)";
    ctx.lineWidth = 1;
    for (let idx = 0; idx < 4; idx += 1) {
      const yy = y + h * (0.24 + idx * 0.15);
      ctx.beginPath();
      ctx.moveTo(x + w * 0.14, yy);
      ctx.bezierCurveTo(
        x + w * 0.3,
        yy - height * 0.03,
        x + w * 0.56,
        yy + height * 0.02,
        x + w * 0.82,
        yy - height * 0.01,
      );
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(72, 58, 44, 0.72)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.18, y + h * 0.78);
    ctx.lineTo(x + w * 0.48, y + h * 0.9);
    ctx.lineTo(x + w * 0.84, y + h * 0.8);
    ctx.stroke();

    ctx.fillStyle = active ? "rgba(92, 72, 52, 0.66)" : "rgba(78, 60, 44, 0.54)";
    ctx.beginPath();
    ctx.arc(x + w * 0.72, y + h * 0.82, width * 0.028, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(142, 130, 116, 0.5)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.fillStyle = "rgba(74, 62, 48, 0.34)";
    for (let idx = 0; idx < 3; idx += 1) {
      const barY = y + h * (0.16 + idx * 0.28);
      ctx.fillRect(x + w * 0.08, barY, w * 0.84, height * 0.012);
    }

    applyPsxDither(
      ctx,
      x - width * 0.02,
      y - height * 0.02,
      w + width * 0.04,
      h + height * 0.06,
      palette,
      active ? 32 : 28,
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
      bindCanvas(contactCanvas, drawLetter),
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
