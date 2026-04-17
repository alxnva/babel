(() => {
  const t = (window.BabelSite = window.BabelSite || {}),
    l = (t.scene = t.scene || {}),
    { clamp01: e, smoothstep01: a, wrappedDistance: o, wrap01: r } = l,
    { GROUND_TEXTURE_PALETTE: i, TOWER_TEXTURE_PALETTE: n } = l;
  function c(t, l, e = 0) {
    const a = 43758.5453123 * Math.sin(12.9898 * t + 78.233 * l + 37.719 * e);
    return a - Math.floor(a);
  }
  function s(t, l, e) {
    const a = new t.CanvasTexture(l);
    return (e(a), a);
  }
  function h(t, e) {
    if (t) return t;
    if (typeof l.getSceneQualityProfile === "function") {
      return l.getSceneQualityProfile(e ? "low" : "high");
    }
    return {
      anisotropy: { min: 1, max: e ? 4 : 8 },
      textures: {
        groundSize: e ? 512 : 1024,
        overlaySize: e ? 256 : 512,
        towerWidth: e ? 320 : 1280,
      },
      tier: e ? "low" : "high",
    };
  }
  ((l.createGroundTextures = function ({ THREE: t, lowPower: l, qualityProfile: p, chooseAnisotropy: e }) {
    const n = h(p, l),
      g = n.tier === "balanced",
      a = n.textures.groundSize,
      o = document.createElement("canvas"),
      r = document.createElement("canvas");
    ((o.width = a), (o.height = a), (r.width = a), (r.height = a));
    const S = o.getContext("2d"),
      T = r.getContext("2d");
    if (!S || !T) return { colorMap: null, bumpMap: null };
    ((S.fillStyle = i.baseColor),
      S.fillRect(0, 0, a, a),
      (T.fillStyle = i.bumpBase),
      T.fillRect(0, 0, a, a));
    const dirtBlotchCount = l ? 60 : g ? 90 : 120;
    for (let t = 0; t < dirtBlotchCount; t += 1) {
      const o = c(t, 601) * a,
        r = c(t, 602) * a,
        s = a * (0.025 + 0.07 * c(t, 603)),
        h = c(t, 604),
        b = S.createRadialGradient(o, r, 0, o, r, s);
      (b.addColorStop(
        0,
        h > 0.58
          ? `rgba(86, 70, 54, ${0.12 + 0.1 * c(t, 605)})`
          : h < 0.32
            ? `rgba(232, 218, 196, ${0.08 + 0.08 * c(t, 606)})`
            : `rgba(168, 148, 124, ${0.06 + 0.08 * c(t, 607)})`,
      ),
        b.addColorStop(1, "rgba(120, 104, 84, 0)"),
        (S.fillStyle = b),
        S.beginPath(),
        S.ellipse(o, r, s, s * (0.6 + 0.5 * c(t, 608)), c(t, 609) * Math.PI, 0, 2 * Math.PI),
        S.fill());
      const bg = T.createRadialGradient(o, r, 0, o, r, s);
      (bg.addColorStop(0, h > 0.5 ? "#9b8e7e" : "#d3c8ba"),
        bg.addColorStop(1, i.bumpBase),
        (T.fillStyle = bg),
        T.beginPath(),
        T.ellipse(o, r, s, s * (0.6 + 0.5 * c(t, 608)), c(t, 609) * Math.PI, 0, 2 * Math.PI),
        T.fill());
    }
    const H = l ? 2600 : g ? 3900 : 5200;
    for (let t = 0; t < H; t += 1) {
      const l = c(t, 21) * a,
        e = c(t, 22) * a,
        o = a * (8e-4 + 0.0038 * c(t, 23)),
        r = c(t, 24);
      ((S.fillStyle =
        r > 0.68
          ? i.emberDustColor
          : r < 0.22
            ? i.coolDustColor
            : `rgba(118, 108, 102, ${0.04 + 0.08 * c(t, 25)})`),
        S.beginPath(),
        S.arc(l, e, o, 0, 2 * Math.PI),
        S.fill());
      const s = 135 + Math.floor(80 * c(t, 26));
      ((T.fillStyle = `rgb(${s}, ${s}, ${s})`),
        T.beginPath(),
        T.arc(l, e, o, 0, 2 * Math.PI),
        T.fill());
    }
    const pebbleCount = l ? 260 : g ? 360 : 520;
    for (let t = 0; t < pebbleCount; t += 1) {
      const o = c(t, 301) * a,
        r = c(t, 302) * a,
        big = c(t, 310) > 0.86,
        s = a * (big ? 0.006 + 0.012 * c(t, 303) : 0.0022 + 0.005 * c(t, 303)),
        l = 44 + Math.floor(46 * c(t, 304)),
        v = c(t, 305),
        shadowOffset = s * 0.35;
      (S.save(),
        (S.fillStyle = `rgba(20, 14, 8, ${0.22 + 0.14 * c(t, 320)})`),
        S.beginPath(),
        S.ellipse(o + shadowOffset, r + shadowOffset, s * 1.05, s * 0.75, 0, 0, 2 * Math.PI),
        S.fill(),
        S.restore(),
        (S.fillStyle =
          v > 0.68
            ? `rgba(${Math.min(240, l + 70)}, ${Math.min(230, l + 60)}, ${Math.min(210, l + 44)}, ${0.55 + 0.25 * c(t, 306)})`
            : v > 0.36
              ? `rgba(${l + 26}, ${l + 18}, ${l + 8}, ${0.48 + 0.25 * c(t, 307)})`
              : `rgba(${Math.max(28, l - 18)}, ${Math.max(22, l - 24)}, ${Math.max(16, l - 30)}, ${0.5 + 0.25 * c(t, 308)})`),
        S.beginPath(),
        S.ellipse(o, r, s, s * (0.75 + 0.25 * c(t, 311)), c(t, 312) * Math.PI, 0, 2 * Math.PI),
        S.fill());
      if (big) {
        const hi = S.createRadialGradient(
          o - s * 0.3,
          r - s * 0.3,
          0,
          o - s * 0.3,
          r - s * 0.3,
          s * 0.7,
        );
        (hi.addColorStop(0, "rgba(255, 246, 224, 0.35)"),
          hi.addColorStop(1, "rgba(255, 246, 224, 0)"),
          (S.fillStyle = hi),
          S.beginPath(),
          S.ellipse(o - s * 0.3, r - s * 0.3, s * 0.5, s * 0.35, 0, 0, 2 * Math.PI),
          S.fill());
      }
      const h = big ? 210 + Math.floor(40 * c(t, 309)) : 170 + Math.floor(60 * c(t, 309));
      ((T.fillStyle = `rgb(${h}, ${h}, ${h})`),
        T.beginPath(),
        T.ellipse(o, r, s, s * (0.75 + 0.25 * c(t, 311)), c(t, 312) * Math.PI, 0, 2 * Math.PI),
        T.fill(),
        (T.fillStyle = "#7d7468"),
        T.beginPath(),
        T.ellipse(o + shadowOffset, r + shadowOffset, s * 1.05, s * 0.75, 0, 0, 2 * Math.PI),
        T.fill());
    }
    const mossColor = i.mossColor || "rgba(66, 84, 44, 0.14)",
      mossCore = i.mossCore || "rgba(86, 104, 54, 0.18)",
      mossCount = l ? 3 : g ? 5 : 6;
    for (let t = 0; t < mossCount; t += 1) {
      const o = c(t, 401) * a,
        r = c(t, 402) * a,
        s = a * (0.03 + 0.05 * c(t, 403)),
        l = S.createRadialGradient(o, r, 0, o, r, s);
      (l.addColorStop(0, mossCore),
        l.addColorStop(0.5, mossColor),
        l.addColorStop(1, "rgba(66, 84, 44, 0)"),
        (S.fillStyle = l),
        S.beginPath(),
        S.ellipse(o, r, s, s * (0.6 + 0.5 * c(t, 404)), c(t, 405) * Math.PI, 0, 2 * Math.PI),
        S.fill());
      for (let l = 0; l < 8; l += 1) {
        const e = o + s * 0.6 * (c(t, 410 + l) - 0.5) * 2,
          i = r + s * 0.6 * (c(t, 420 + l) - 0.5) * 2;
        ((S.fillStyle = `rgba(86, 104, 54, ${0.12 + 0.14 * c(t, 430 + l)})`),
          S.beginPath(),
          S.arc(e, i, 0.9 + 1.4 * c(t, 440 + l), 0, 2 * Math.PI),
          S.fill());
      }
    }
    const breakupCount = l ? 40 : g ? 60 : 90;
    for (let t = 0; t < breakupCount; t += 1) {
      const o = c(t, 501) * a,
        r = c(t, 502) * a,
        s = a * (0.05 + 0.12 * c(t, 503)),
        l = S.createRadialGradient(o, r, 0, o, r, s),
        h = c(t, 504);
      (l.addColorStop(
        0,
        h > 0.5
          ? `rgba(40, 34, 28, ${0.03 + 0.04 * c(t, 505)})`
          : `rgba(248, 236, 216, ${0.02 + 0.03 * c(t, 506)})`,
      ),
        l.addColorStop(1, "rgba(0, 0, 0, 0)"),
        (S.fillStyle = l),
        S.beginPath(),
        S.arc(o, r, s, 0, 2 * Math.PI),
        S.fill());
    }
    const b = e(n.anisotropy.min, n.anisotropy.max);
    return {
      colorMap: s(t, o, (l) => {
        ((l.wrapS = t.MirroredRepeatWrapping),
          (l.wrapT = t.MirroredRepeatWrapping),
          l.repeat.set(4, 4),
          (l.anisotropy = b),
          (l.encoding = t.sRGBEncoding));
      }),
      bumpMap: s(t, r, (l) => {
        ((l.wrapS = t.MirroredRepeatWrapping),
          (l.wrapT = t.MirroredRepeatWrapping),
          l.repeat.set(4, 4),
          (l.anisotropy = b));
      }),
    };
  }),
    (l.createGroundOverlayTexture = function ({ THREE: t, lowPower: l, qualityProfile: a }) {
      const r = h(a, l),
        e = r.textures.overlaySize,
        n = document.createElement("canvas");
      ((n.width = e), (n.height = e));
      const o = n.getContext("2d");
      if (!o) return null;
      o.clearRect(0, 0, e, e);
      const s = e / 2,
        p = i.dampColor || "rgba(64, 82, 110, 0.10)",
        f = o.createRadialGradient(s, s, 0, s, s, 0.22 * e);
      (f.addColorStop(0, p),
        f.addColorStop(0.5, "rgba(64, 82, 110, 0.04)"),
        f.addColorStop(1, "rgba(64, 82, 110, 0)"),
        (o.fillStyle = f),
        o.fillRect(0, 0, e, e));
      const d = o.createRadialGradient(s, s, 0.06 * e, s, s, 0.36 * e);
      (d.addColorStop(0, "rgba(174, 120, 72, 0.13)"),
        d.addColorStop(0.55, "rgba(174, 120, 72, 0.05)"),
        d.addColorStop(1, "rgba(174, 120, 72, 0)"),
        (o.fillStyle = d),
        o.fillRect(0, 0, e, e));
      const g = o.createRadialGradient(s, s, 0, s, s, 0.12 * e);
      (g.addColorStop(0, "rgba(12, 16, 24, 0.22)"),
        g.addColorStop(0.7, "rgba(12, 16, 24, 0.06)"),
        g.addColorStop(1, "rgba(12, 16, 24, 0)"),
        (o.fillStyle = g),
        o.fillRect(0, 0, e, e));
      const b = o.createRadialGradient(s, s, 0.38 * e, s, s, 0.5 * e);
      (b.addColorStop(0, "rgba(10, 12, 22, 0)"),
        b.addColorStop(1, "rgba(10, 12, 22, 0.22)"),
        (o.fillStyle = b),
        o.fillRect(0, 0, e, e));
      const m = new t.CanvasTexture(n);
      return (
        (m.wrapS = t.ClampToEdgeWrapping),
        (m.wrapT = t.ClampToEdgeWrapping),
        (m.encoding = t.sRGBEncoding),
        m
      );
    }),
    (l.createTowerTextures = function ({
      THREE: t,
      lowPower: l,
      qualityProfile: qualityProfile,
      chooseAnisotropy: chooseAnisotropy,
      collapseYaw: collapseYaw,
      collapseSpread: collapseSpread,
    }) {
      const E = h(qualityProfile, l),
        P = E.tier === "balanced",
        d = E.textures.towerWidth,
        S = 2 * d,
        rowCount = l ? 20 : P ? 32 : 48,
        columnCount = l ? 20 : P ? 28 : 34,
        b = document.createElement("canvas"),
        m = document.createElement("canvas");
      ((b.width = d), (b.height = S), (m.width = d), (m.height = S));
      const R = b.getContext("2d"),
        y = m.getContext("2d");
      if (!R || !y) return { colorMap: null, bumpMap: null };
      const u = r(collapseYaw / (2 * Math.PI)),
        w = Math.max(0.08, collapseSpread / (2 * Math.PI)),
        M = S / rowCount,
        C = d / columnCount,
        T = l ? 1 : P ? 1.2 : 1.4;
      ((R.imageSmoothingEnabled = !1),
        (y.imageSmoothingEnabled = !1),
        (R.fillStyle = n.mapBase),
        R.fillRect(0, 0, d, S),
        (y.fillStyle = n.bumpBase),
        y.fillRect(0, 0, d, S));
      for (let t = 0; t < rowCount; t += 1) {
        const l = t * M,
          i = t / Math.max(1, rowCount - 1),
          s = Math.pow(i, 1.55),
          p = t % 2 == 0 ? 0 : C / 2;
        ((R.fillStyle = t % 5 == 0 ? "rgba(0, 0, 0, 0.018)" : "rgba(255, 255, 255, 0.012)"),
          R.fillRect(0, l, d, M));
        for (let f = -1; f <= columnCount + 1; f += 1) {
          const S = f * C + p,
            h = r((S + 0.5 * C) / d),
            g = e(1 - o(h, u) / w) * a(Math.max(0, (i - 0.42) / 0.58)),
            b = T * (0.62 + 0.48 * c(t, f, 1) * (1 + s)),
            m = T * (0.72 + 0.44 * c(t, f, 2) * (1 + s)),
            E = Math.max(C - 2 * b, 0.58 * C),
            P = Math.max(M - 1.6 * m, 0.52 * M),
            x = S + b,
            W = l + m,
            v = (c(t, f, 3) - 0.5) * (0.16 + 0.12 * s),
            G = c(t, f, 4);
          if (
            ((R.fillStyle = v >= 0 ? `rgba(255, 255, 255, ${v})` : `rgba(0, 0, 0, ${Math.abs(v)})`),
            R.fillRect(x, W, E, P),
            G > 0.72
              ? ((R.fillStyle = n.warmStain), R.fillRect(x, W, E, P))
              : G > 0.48
                ? ((R.fillStyle = n.coolStain), R.fillRect(x, W, E, P))
                : G < 0.16 && ((R.fillStyle = n.mossStain), R.fillRect(x, W, E, P)),
            (R.fillStyle = n.mortarShadow),
            R.fillRect(x, W + P - 1, E, 1),
            (R.fillStyle = n.mortarHighlight),
            R.fillRect(x, W, E, 1),
            g > 0.02 &&
              ((R.fillStyle = `rgba(0, 0, 0, ${0.01 + 0.06 * g})`),
              R.fillRect(x, W, E, P),
              c(t, f, 5) > 0.58))
          ) {
            const l = T * (1.2 + 2.8 * c(t, f, 6) + 1.8 * g),
              e = M * (0.08 + 0.18 * c(t, f, 7)),
              a = c(t, f, 8) > 0.5 ? x : x + E - l,
              o = W + c(t, f, 9) * Math.max(1, P - e);
            ((R.fillStyle = n.sootStain),
              R.fillRect(a, o, l, e),
              (y.fillStyle = "#98a3b8"),
              y.fillRect(a, o, l, e));
          }
          const I = S - T / 2 + (c(t, f, 10) - 0.5) * T * (0.7 + s),
            $ = l + 0.8 * T,
            B = Math.max(0.38 * M, M - T * (1.8 + c(t, f, 11) * (1 + s)));
          if (
            ((R.fillStyle = n.mortarShadow),
            R.fillRect(I, $, T, B),
            (y.fillStyle = "#98a3b8"),
            y.fillRect(I, $, T, B),
            i > 0.52 && c(t, f, 12) > 0.64 - 0.2 * g)
          ) {
            const e = M * (0.32 + 0.58 * c(t, f, 13)),
              a = C * (0.02 + 0.04 * c(t, f, 14)),
              o = R.createLinearGradient(0, l, 0, l + e);
            (o.addColorStop(0, n.sootStain),
              o.addColorStop(1, "rgba(0, 0, 0, 0)"),
              (R.fillStyle = o),
              R.fillRect(x + E * c(t, f, 15), l, a, e));
          }
        }
      }
      const collapseGradient = R.createLinearGradient(u * d - 0.24 * d, 0, u * d + 0.18 * d, 0);
      (collapseGradient.addColorStop(0, "rgba(0, 0, 0, 0)"),
        collapseGradient.addColorStop(0.36, "rgba(0, 0, 0, 0.05)"),
        collapseGradient.addColorStop(0.5, n.collapseShadow),
        collapseGradient.addColorStop(0.68, "rgba(0, 0, 0, 0.04)"),
        collapseGradient.addColorStop(1, "rgba(0, 0, 0, 0)"),
        (R.fillStyle = collapseGradient),
        R.fillRect(0, 0, d, S));
      const weatheringCount = l ? 48 : 150;
      for (let t = 0; t < weatheringCount; t += 1) {
        const l = c(t, 101) * d,
          e = S * (0.06 + 0.88 * c(t, 102)),
          a = d * (0.0014 + 0.0038 * c(t, 103)),
          o = S * (0.001 + 0.0028 * c(t, 104));
        ((R.fillStyle = `rgba(0, 0, 0, ${0.01 + 0.012 * c(t, 105)})`),
          R.beginPath(),
          R.ellipse(l, e, a, o, c(t, 106) * Math.PI, 0, 2 * Math.PI),
          R.fill(),
          (y.fillStyle = "#aca59d"),
          y.beginPath(),
          y.ellipse(l, e, a, o, c(t, 107) * Math.PI, 0, 2 * Math.PI),
          y.fill());
      }
      const x = R.createLinearGradient(0, 0.56 * S, 0, S);
      (x.addColorStop(0, "rgba(0, 0, 0, 0)"),
        x.addColorStop(1, "rgba(0, 0, 0, 0.05)"),
        (R.fillStyle = x),
        R.fillRect(0, 0.56 * S, d, 0.44 * S));
      const W = chooseAnisotropy(3, 8);
      return {
        colorMap: s(t, b, (l) => {
          ((l.wrapS = t.RepeatWrapping),
            (l.wrapT = t.ClampToEdgeWrapping),
            (l.encoding = t.sRGBEncoding),
            (l.anisotropy = W));
        }),
        bumpMap: s(t, m, (l) => {
          ((l.wrapS = t.RepeatWrapping), (l.wrapT = t.ClampToEdgeWrapping), (l.anisotropy = W));
        }),
      };
    }));
})();
