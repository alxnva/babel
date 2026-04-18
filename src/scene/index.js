(() => {
  const e = (window.BabelSite = window.BabelSite || {}),
    t = (e.scene = e.scene || {}),
    {
      clamp01: o,
      groundHeight: a,
      smoothstep01: r,
      supportsWebGL: n,
      wrappedDistance: s,
      wrap01: i,
      GROUND_SURFACE_MATERIAL: l,
      TOWER_SURFACE_MATERIALS: h,
      PLANT_PALETTE: plantPalette,
      createGroundTextures: c,
      createTowerTextures: d,
      createGroundOverlayTexture: createGroundOverlayTexture,
    } = t;
  t.initHomeScene = function () {
    const e = document.getElementById("home-scene");
    if (!e || !window.THREE || !n()) return;
    // Boot order:
    // 1. Renderer + fixed composition
    // 2. Camera-following atmosphere layers
    // 3. Scroll-driven animation loop
    const cloudGroups = [];
    let cloudsEnabled = true;
    function setCloudGroupSceneVisibility(group, visible) {
      if (!group) return;
      group.userData = group.userData || {};
      group.userData.sceneVisible = visible;
      group.visible = cloudsEnabled && visible;
    }
    function applyCloudVisibility() {
      cloudGroups.forEach((g) => {
        if (g) {
          const sceneVisible = g.userData?.sceneVisible !== false;
          g.visible = cloudsEnabled && sceneVisible;
        }
      });
    }
    t.setClouds = function (on) {
      ((cloudsEnabled = !!on), applyCloudVisibility());
    };
    t.toggleClouds = function () {
      ((cloudsEnabled = !cloudsEnabled), applyCloudVisibility(), cloudsEnabled);
      return cloudsEnabled;
    };
    const reducedMotionMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fallbackProfile =
      typeof t.getSceneQualityProfile === "function"
        ? t.getSceneQualityProfile("high")
        : {
            tier: "high",
            isLow: false,
            antialias: true,
            anisotropy: { min: 1, max: 8 },
            counts: {
              orbitalGlowLayers: 3,
              haloSprites: 90,
              haloBands: 50,
              haloTwisters: 28,
              upperGlowSprites: 14,
              midCloudTextures: 8,
              midCloudSprites: 26,
              groundPlantSprites: 220,
              buttresses: 8,
              reliefBricks: 36,
              driftClouds: 16,
              emberClouds: 34,
              hazeClouds: 40,
              pulseClouds: 4,
              pulsePuffsPerCluster: 5,
              plumeColumns: 18,
              craterHaze: 7,
            },
            dprCap: 2,
            geometry: {
              circleSegments: 88,
              overlaySegments: 80,
              pointFieldCount: 210,
              skyHeightSegments: 14,
              skyWidthSegments: 24,
            },
            lighting: {
              ambientIntensity: 0.22,
              directionalIntensity: 3.55,
              extraDirectional: true,
              fogFar: 150,
              fogNear: 62,
              hemisphereIntensity: 0.71,
            },
            shadows: { enabled: true, mapSize: 1536 },
            textures: {
              cloudAtlasSize: 512,
              groundSize: 1024,
              overlaySize: 512,
              towerWidth: 1280,
            },
          };
    const sceneTunerDefaults =
      typeof t.getSceneTunerDefaults === "function"
        ? t.getSceneTunerDefaults()
        : { defaultVisible: true, defaultZoom: 12, maxZoom: 18, minZoom: -12 };
    const fallbackComposition =
      typeof t.getSceneCompositionProfile === "function"
        ? t.getSceneCompositionProfile({
            width: window.innerWidth,
            height: window.innerHeight,
            zoom: sceneTunerDefaults.defaultZoom,
          })
        : {
            camera: {
              fov: 46,
              heightBase: 21.9,
              heightScrollDelta: 0.9,
              lookAtBase: 12.4,
              lookAtScrollDelta: 2.1,
              orbitBase: window.innerWidth < 1100 ? 55 : 46,
              orbitScale: 1.14,
              orbitScrollDelta: 2.4,
              orbitTrim: 0.18,
            },
            cloudAnchorY: -7.5,
            name: window.innerWidth <= 760 && window.innerHeight > window.innerWidth ? "portraitPhone" : "desktop",
            sceneOffsetY: -7.5,
            towerScale: 1,
          };
    const qualityState =
      typeof t.createSceneQualityState === "function"
        ? t.createSceneQualityState({
            navigatorInfo: navigator,
            search: window.location?.search || "",
            viewport: { width: window.innerWidth, height: window.innerHeight },
          })
        : {
            caps: { maxAnisotropy: 1, maxTextureSize: 0 },
            controls: { debug: false, overrideTier: null, requestedTier: "auto" },
            getProfile() {
              return fallbackProfile;
            },
            initialTier: fallbackProfile.tier,
            sample() {
              return null;
            },
          };
    const qualityControls = qualityState.controls || {
      debug: false,
      overrideTier: null,
      requestedTier: "auto",
    };
    const qualityDebug = qualityControls.debug ? (window.BabelSite.sceneDebug = {}) : null;
    function updateSceneDebug(extra = {}) {
      if (!qualityDebug) return;
      Object.assign(qualityDebug, {
        caps: qualityState.caps || null,
        initialTier: qualityState.initialTier || fallbackProfile.tier,
        overrideTier: qualityControls.overrideTier,
        requestedTier: qualityControls.requestedTier,
        tier: i.profile.tier,
        ...extra,
      });
    }
    let sceneVisible = true;
    if (typeof IntersectionObserver === "function") {
      try {
        const io = new IntersectionObserver(
          (entries) => {
            for (const ent of entries) sceneVisible = ent.isIntersecting;
          },
          { threshold: 0 },
        );
        io.observe(e);
      } catch (_err) {
        sceneVisible = true;
      }
    }
    const i = { lowPower: fallbackProfile.isLow, profile: fallbackProfile },
      w = i.profile.geometry.skyWidthSegments,
      p = i.profile.geometry.skyHeightSegments,
      M = i.profile.geometry.circleSegments,
      E = i.profile.geometry.overlaySegments,
      m = i.profile.counts.upperGlowSprites,
      u = i.profile.geometry.pointFieldCount,
      g = {
        fogColor: 2236204,
        fogNear: i.profile.lighting.fogNear,
        fogFar: i.profile.lighting.fogFar,
        ambientColor: 16048366,
        ambientIntensity: i.profile.lighting.ambientIntensity,
        hemisphereSkyColor: 8688804,
        hemisphereGroundColor: 2104108,
        hemisphereIntensity: i.profile.lighting.hemisphereIntensity,
        directionalColor: 16764342,
        directionalIntensity: i.profile.lighting.directionalIntensity,
        directionalPosition: { x: 21, y: 29, z: 23 },
      },
      f = {
        skyTopColor: 2500953,
        skyBottomColor: 794687,
        skyGlowColor: 14927322,
        sunDirection: new THREE.Vector3(18, 15, 33).normalize(),
        sunColor: 16638446,
        shellOpacity: 0.472,
      },
      T = new THREE.Scene();
    function s() {
      return i.profile.isLow;
    }
    T.fog = new THREE.Fog(g.fogColor, g.fogNear, g.fogFar);
    const R = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 240),
      b = new THREE.WebGLRenderer({
        alpha: !0,
        antialias: i.profile.antialias,
        powerPreference: "high-performance",
      });
    function P(e, t) {
      const n = i.profile.anisotropy || { min: e, max: t };
      const s = Math.max(e, n.min ?? e);
      const o = Math.min(t, n.max ?? t);
      return Math.max(1, Math.min(b.capabilities.getMaxAnisotropy(), i.lowPower ? s : o));
    }
    (b.setClearColor(0, 0),
      (b.outputEncoding = THREE.sRGBEncoding),
      (b.shadowMap.type = THREE.PCFSoftShadowMap),
      e.appendChild(b.domElement));
    const visibilityTracker =
      typeof t.createSceneVisibilityTracker === "function"
        ? t.createSceneVisibilityTracker({ THREE, camera: R })
        : null;
    const decorativeSystems = [];
    function registerDecorativeSystem(config) {
      const system = {
        active: true,
        bucket: config.importance === "core" ? "core" : "midAtmosphere",
        ...config,
      };
      decorativeSystems.push(system);
      return system;
    }
    function getProfileCount(key, fallback) {
      const value = i.profile.counts?.[key];
      return typeof value === "number" ? value : fallback;
    }
    function setRecordVisibility(records, active, limit = records.length) {
      for (let index = 0; index < records.length; index += 1) {
        const record = records[index];
        const visible = active && index < limit;
        if (record.mesh) record.mesh.visible = visible;
        if (record.meshes) {
          record.meshes.forEach((mesh) => {
            mesh.visible = visible;
          });
        }
      }
    }
    function setShadowParticipation(target, { cast = false, receive = false } = {}) {
      if (!target || typeof target.traverse !== "function") return;
      target.traverse((node) => {
        if ("castShadow" in node) node.castShadow = cast;
        if ("receiveShadow" in node) node.receiveShadow = receive;
      });
    }
    function applyActiveQualityProfile(profile, reason = "runtime") {
      i.profile = profile || fallbackProfile;
      i.lowPower = i.profile.isLow;
      T.fog.near = i.profile.lighting.fogNear;
      T.fog.far = i.profile.lighting.fogFar;
      H.intensity = i.profile.lighting.ambientIntensity;
      y.intensity = i.profile.lighting.hemisphereIntensity;
      v.intensity = i.profile.lighting.directionalIntensity;
      fillLight.visible = Boolean(i.profile.lighting.extraDirectional);
      b.shadowMap.enabled = Boolean(i.profile.shadows.enabled);
      v.castShadow = Boolean(i.profile.shadows.enabled);
      if (i.profile.shadows.enabled && i.profile.shadows.mapSize > 0) {
        (v.shadow.mapSize.width = i.profile.shadows.mapSize),
          (v.shadow.mapSize.height = i.profile.shadows.mapSize),
          (v.shadow.needsUpdate = !0);
      }
      const pixelRatio = Math.min(window.devicePixelRatio || 1, i.profile.dprCap || 1);
      b.setPixelRatio(pixelRatio);
      updateSceneDebug({ reason, pixelRatio });
    }
    const S = new THREE.Group();
    T.add(S);
    const H = new THREE.AmbientLight(g.ambientColor, g.ambientIntensity),
      y = new THREE.HemisphereLight(
        g.hemisphereSkyColor,
        g.hemisphereGroundColor,
        g.hemisphereIntensity,
      ),
      v = new THREE.DirectionalLight(g.directionalColor, g.directionalIntensity),
      fillLight = new THREE.DirectionalLight(9086928, 0.6);
    (v.position.set(g.directionalPosition.x, g.directionalPosition.y, g.directionalPosition.z),
      (v.shadow.camera.left = -60),
      (v.shadow.camera.right = 60),
      (v.shadow.camera.top = 60),
      (v.shadow.camera.bottom = -60),
      (v.shadow.camera.near = 1),
      (v.shadow.camera.far = 120),
      (v.shadow.bias = -0.00045),
      (v.shadow.normalBias = 0.028),
      (v.shadow.radius = 2.6),
      fillLight.position.set(-18, 22, -14),
      T.add(H, y, v, fillLight),
      applyActiveQualityProfile(
        typeof qualityState.getProfile === "function" ? qualityState.getProfile() : fallbackProfile,
        "initial",
      ));
    const x = new THREE.Mesh(
      new THREE.SphereGeometry(130, w, p),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: !0,
        uniforms: {
          topColor: { value: new THREE.Color(f.skyTopColor) },
          bottomColor: { value: new THREE.Color(f.skyBottomColor) },
          glowColor: { value: new THREE.Color(f.skyGlowColor) },
          sunDirection: { value: f.sunDirection },
          sunColor: { value: new THREE.Color(f.sunColor) },
          uTime: { value: 0 },
        },
        vertexShader: [
          "varying vec3 vWorldPosition;",
          "void main() {",
          "  vec4 worldPosition = modelMatrix * vec4(position, 1.0);",
          "  vWorldPosition = worldPosition.xyz;",
          "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
          "}",
        ].join("\n"),
        fragmentShader: [
          "uniform vec3 topColor;",
          "uniform vec3 bottomColor;",
          "uniform vec3 glowColor;",
          "uniform vec3 sunDirection;",
          "uniform vec3 sunColor;",
          "uniform float uTime;",
          "varying vec3 vWorldPosition;",
          "void main() {",
          "  float h = normalize(vWorldPosition + vec3(0.0, 40.0, 0.0)).y;",
          "  float t = smoothstep(-0.2, 0.7, h);",
          "  vec3 col = mix(bottomColor, topColor, t);",
          "  float glow = smoothstep(0.02, 0.7, 1.0 - distance(normalize(vWorldPosition).xz, vec2(0.0)));",
          "  col += glowColor * glow * 0.031;",
          "  float sunDot = max(0.0, dot(normalize(vWorldPosition), sunDirection));",
          "  float sunGlow = pow(sunDot, 8.0) * 0.225 + pow(sunDot, 32.0) * 0.152;",
          "  col += sunColor * sunGlow;",
          "  vec3 nDir = normalize(vWorldPosition);",
          "  vec2 starUV = nDir.xz / (abs(nDir.y) + 0.5) * 90.0;",
          "  vec2 cell = floor(starUV);",
          "  vec2 fr = fract(starUV) - 0.5;",
          "  float starHash = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);",
          "  float starBright = step(0.965, starHash) * smoothstep(0.14, 0.0, length(fr));",
          "  starBright *= smoothstep(0.0, 0.4, h);",
          "  float twinkleHash = fract(sin(dot(cell, vec2(269.5, 183.3))) * 61537.17);",
          "  float twinkle = step(0.7, twinkleHash);",
          "  float twinkleSpeed = 1.5 + twinkleHash * 3.0;",
          "  float twinklePhase = twinkleHash * 6.2832;",
          "  float twinkleAmt = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * twinkleSpeed + twinklePhase));",
          "  starBright *= mix(1.0, twinkleAmt, twinkle);",
          "  col += vec3(1.0, 0.95, 0.88) * starBright * 0.73;",
          `  gl_FragColor = vec4(col, ${f.shellOpacity});`,
          "}",
        ].join("\n"),
      }),
    );
    ((x.renderOrder = -1), (x.material.depthWrite = !1), T.add(x));
    var C = new THREE.Vector3(-75, 50, -60),
      I = new THREE.Group();
    function z(e, t, o, a) {
      var r = document.createElement("canvas");
      ((r.width = e), (r.height = e));
      var n = r.getContext("2d"),
        s = e / 2,
        i = e / 2;
      (n.beginPath(), n.arc(s, i, s, 0, 2 * Math.PI), n.closePath(), n.clip());
      var l = n.createRadialGradient(s, i, 0, s, i, s);
      (l.addColorStop(0, "rgba(" + t + "," + o + "," + a + ",0.7)"),
        l.addColorStop(
          0.18,
          "rgba(" + t + "," + Math.floor(0.7 * o) + "," + Math.floor(0.6 * a) + ",0.35)",
        ),
        l.addColorStop(
          0.38,
          "rgba(" +
            Math.floor(0.85 * t) +
            "," +
            Math.floor(0.4 * o) +
            "," +
            Math.floor(0.3 * a) +
            ",0.14)",
        ),
        l.addColorStop(
          0.6,
          "rgba(" + Math.floor(0.65 * t) + "," + Math.floor(0.2 * o) + ",0,0.04)",
        ),
        l.addColorStop(0.85, "rgba(30,2,0,0.01)"),
        l.addColorStop(1, "rgba(0,0,0,0)"),
        (n.fillStyle = l),
        n.fillRect(0, 0, e, e));
      var h = new THREE.CanvasTexture(r);
      return ((h.encoding = THREE.sRGBEncoding), h);
    }
    (I.position.copy(C), T.add(I));
    var G = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: z(256, 200, 60, 10),
        color: 16728096,
        transparent: !0,
        opacity: 0.5,
        depthWrite: !1,
        depthTest: !0,
        fog: !1,
      }),
    );
    (G.scale.set(26, 26, 1), (G.renderOrder = 98), (G.visible = !1));
    var B = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: z(256, 255, 180, 60),
        color: 16752688,
        transparent: !0,
        opacity: 0.8,
        depthWrite: !1,
        depthTest: !0,
        fog: !1,
        blending: THREE.AdditiveBlending,
      }),
    );
    (B.scale.set(17, 17, 1), (B.renderOrder = 101), (B.visible = !1));
    var A = new THREE.SpriteMaterial({
        map: (function (e) {
          var t = document.createElement("canvas");
          ((t.width = e), (t.height = e));
          var o = t.getContext("2d"),
            a = 256,
            r = 256;
          (o.beginPath(), o.arc(a, r, 256, 0, 2 * Math.PI), o.closePath(), o.clip());
          var n = o.createRadialGradient(a, r, 0, a, r, 256);
          (n.addColorStop(0, "#ffffff"),
            n.addColorStop(0.12, "#fffde0"),
            n.addColorStop(0.25, "#ffeba8"),
            n.addColorStop(0.4, "#ffc050"),
            n.addColorStop(0.55, "#ff9928"),
            n.addColorStop(0.67, "rgba(240,90,15,0.6)"),
            n.addColorStop(0.78, "rgba(200,50,5,0.2)"),
            n.addColorStop(0.88, "rgba(100,20,0,0.04)"),
            n.addColorStop(1, "rgba(0,0,0,0)"),
            (o.fillStyle = n),
            o.fillRect(0, 0, e, e));
          for (var s = 0; s < 400; s++) {
            var i = Math.random() * Math.PI * 2,
              l = 256 * Math.random() * 0.45,
              h = a + Math.cos(i) * l,
              c = r + Math.sin(i) * l,
              d = 2 + 10 * Math.random(),
              w = o.createRadialGradient(h, c, 0, h, c, d),
              p = Math.random();
            (p > 0.55
              ? (w.addColorStop(0, "rgba(255,255,230," + (0.08 + 0.14 * Math.random()) + ")"),
                w.addColorStop(1, "rgba(255,220,140,0)"))
              : p > 0.25
                ? (w.addColorStop(0, "rgba(200,70,8," + (0.06 + 0.1 * Math.random()) + ")"),
                  w.addColorStop(1, "rgba(160,40,0,0)"))
                : (w.addColorStop(0, "rgba(60,15,0," + (0.1 + 0.12 * Math.random()) + ")"),
                  w.addColorStop(1, "rgba(80,20,0,0)")),
              (o.fillStyle = w),
              o.fillRect(h - d, c - d, 2 * d, 2 * d));
          }
          var M = o.createRadialGradient(a, r, 153.6, a, r, 235.52);
          (M.addColorStop(0, "rgba(0,0,0,0)"),
            M.addColorStop(1, "rgba(120,30,0,0.25)"),
            (o.fillStyle = M),
            o.fillRect(0, 0, e, e));
          var E = new THREE.CanvasTexture(t);
          return ((E.encoding = THREE.sRGBEncoding), E);
        })(512),
        color: 16777215,
        transparent: !0,
        opacity: 1,
        depthWrite: !1,
        depthTest: !0,
        fog: !1,
      }),
      F = new THREE.Sprite(A);
    function W(e, t) {
      var o = document.createElement("canvas");
      ((o.width = e), (o.height = e));
      var a = o.getContext("2d"),
        r = e / 2;
      (a.beginPath(), a.arc(r, r, r, 0, 2 * Math.PI), a.closePath(), a.clip());
      var n = 0.03 * Math.sin(7.3 * t) * e,
        s = 0.03 * Math.cos(5.1 * t) * e,
        i = a.createRadialGradient(r + n, r + s, 0, r, r, r);
      (i.addColorStop(0, "rgba(255,255,235,1.0)"),
        i.addColorStop(0.15, "rgba(255,230,130,0.85)"),
        i.addColorStop(0.35, "rgba(255,170,40,0.5)"),
        i.addColorStop(0.55, "rgba(240,90,10,0.22)"),
        i.addColorStop(0.78, "rgba(160,30,0,0.06)"),
        i.addColorStop(1, "rgba(0,0,0,0)"),
        (a.fillStyle = i),
        a.fillRect(0, 0, e, e));
      var l = new THREE.CanvasTexture(o);
      return ((l.encoding = THREE.sRGBEncoding), l);
    }
    (F.scale.set(6, 6, 1), (F.renderOrder = 100), I.add(F));
    for (var k = [], $ = 0; $ < 4; $++) k.push(W(64, 3.7 * $ + 1));
    for (
      var Y = [16777215, 16774352, 16763972, 16755232, 16746512, 16733440, 15610624],
        D = [],
        O = i.profile.counts.haloSprites,
        q = i.profile.counts.haloBands,
        L = O + q + i.profile.counts.haloTwisters,
        V = 0;
      V < L;
      V++
    ) {
      var X = 97.3 * V + 13,
        N = V < O ? 0 : V < O + q ? 1 : 2,
        U =
          0 === N
            ? Math.floor(3 * Math.abs(Math.sin(1.3 * X)))
            : 1 === N
              ? 2 + Math.floor(3 * Math.abs(Math.sin(2.7 * X)))
              : 4 + Math.floor(3 * Math.abs(Math.sin(2.7 * X))),
        Z = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: k[V % 4],
            color: Y[Math.min(U, 6)],
            transparent: !0,
            opacity: 0 === N ? 0.55 : 1 === N ? 0.42 : 0.3,
            depthWrite: !1,
            depthTest: !0,
            fog: !1,
            blending: THREE.AdditiveBlending,
          }),
        );
      ((Z.renderOrder = 2 - N + 103), I.add(Z));
      var j = Math.abs(Math.sin(6.7 * X)),
        _ = Math.abs(Math.sin(1.37 * X));
      D.push({
        sprite: Z,
        layer: N,
        theta: (V / L) * Math.PI * 2 * 3.7 + 2 * Math.sin(X),
        phi: Math.acos(1 - 2 * _),
        orbitRadius:
          0 === N
            ? 0.8 + 1.5 * Math.abs(Math.sin(2.1 * X))
            : 1 === N
              ? 2 + 2 * Math.abs(Math.sin(2.1 * X))
              : 3.5 + 2 * Math.abs(Math.sin(2.1 * X)),
        orbitSpeed:
          0 === N
            ? 0.2 + 0.5 * Math.abs(Math.sin(1.4 * X))
            : 1 === N
              ? 0.1 + 0.3 * Math.abs(Math.sin(1.4 * X))
              : 0.04 + 0.18 * Math.abs(Math.sin(1.4 * X)),
        wobbleAmp:
          0 === N
            ? 0.15 + 0.4 * Math.abs(Math.sin(3.2 * X))
            : 0.3 + 1 * Math.abs(Math.sin(3.2 * X)),
        wobbleFreq: 0.8 + 2 * Math.abs(Math.sin(0.8 * X)),
        baseScale:
          0 === N
            ? 0.3 + 0.5 * Math.abs(Math.sin(1.9 * X))
            : 1 === N
              ? 0.5 + 1 * Math.abs(Math.sin(1.9 * X))
              : 0.8 + 1.4 * Math.abs(Math.sin(1.9 * X)),
        phase: (1.618 * X) % (2 * Math.PI),
        wobble2Amp: 0.1 + 0.5 * Math.abs(Math.sin(5.1 * X)),
        wobble2Freq: 1.2 + 2.5 * Math.abs(Math.sin(2.9 * X)),
        violenceAmp: 1.5 + 4 * j,
        violenceFreq: 0.3 + 0.6 * j,
        violencePhase: 2.3 * X,
        colorSpeed: 0.15 + 0.35 * Math.abs(Math.sin(3.8 * X)),
        colorPhase: (0.73 * X) % (2 * Math.PI),
      });
    }
    var Q = new THREE.Vector3(),
      J = new THREE.Vector3(),
      K = new THREE.Vector3();
    function ee(e, t, o, a, r) {
      for (var n = [], s = 0; s <= r; s++) {
        var i = s / r,
          l = e + (i - 0.5) * o,
          h = 8.3 + Math.pow(Math.sin(i * Math.PI), 0.7) * t,
          c = Math.cos(l) * h,
          d = Math.sin(l) * h,
          w = i > 0.6 ? 2.5 * (i - 0.6) * t * 0.3 : 0,
          p = Math.sin(i * Math.PI) * Math.sin(a) * t * 0.5 + w * Math.cos(a);
        n.push(new THREE.Vector3(c, d, p));
      }
      return n;
    }
    for (var te = [], oe = i.profile.counts.orbitalGlowLayers, ae = 0; ae < oe; ae++) {
      for (
        var re = 137.5 * ae + 42,
          ne = function (e) {
            return Math.abs(Math.sin(e));
          },
          se = (ae / oe) * Math.PI * 2 + 0.5 * Math.sin(re),
          ie = 6 + 10 * ne(2.3 * re),
          le = 0.4 + 0.6 * ne(1.1 * re),
          he = 1.4 * (Math.sin(3.7 * re) - 0.5),
          ce = 0.12 + 0.18 * ne(1.7 * re),
          de = ee(se, ie, le, he, 20),
          we = new THREE.CatmullRomCurve3(de),
          pe = new THREE.TubeGeometry(we, 24, ce, 4, !1),
          Me = [],
          Ee = [],
          me = pe.attributes.position,
          ue = 0;
        ue < me.count;
        ue++
      ) {
        var ge = me.getX(ue),
          fe = me.getY(ue),
          Te = me.getZ(ue),
          Re = Math.sqrt(ge * ge + fe * fe + Te * Te),
          be = Math.max(0, Math.min(1, (Re - 8) / (ie + 1)));
        (Ee.push(be), Me.push(1, 0.98 - 0.65 * be, 0.75 - 0.7 * be));
      }
      pe.setAttribute("color", new THREE.Float32BufferAttribute(Me, 3));
      var Pe = Me.slice(),
        Se = new THREE.MeshBasicMaterial({
          vertexColors: !0,
          transparent: !0,
          opacity: 0,
          depthWrite: !1,
          depthTest: !0,
          fog: !1,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        }),
        He = new THREE.Mesh(pe, Se);
      ((He.renderOrder = 102),
        I.add(He),
        te.push({
          mesh: He,
          geo: pe,
          heightFracs: Ee,
          baseColors: Pe,
          phase: 7 * ae,
          growTime: 0.8 + 0.6 * ne(0.9 * re),
          holdTime: 1.5 + 1.5 * ne(1.3 * re),
          shrinkTime: 1.2 + 0.8 * ne(2.1 * re),
          pauseTime: 7 + 5 * ne(0.5 * re),
          noReturn: ne(4.1 * re) > 0.6,
        }));
    }
    const haloSystem = registerDecorativeSystem({
      getCenter(target) {
        return target.copy(C);
      },
      group: I,
      importance: "midAtmosphere",
      name: "halo",
      radius: 42,
    });
    setShadowParticipation(I);
    const ye = new THREE.Group();
    S.add(ye);
    const ve = new THREE.CircleGeometry(88, M, 0, 2 * Math.PI),
      xe = ve.attributes.position;
    for (let e = 0; e < xe.count; e += 1) {
      const t = xe.getX(e),
        o = xe.getY(e);
      xe.setZ(e, a(t, o));
    }
    ve.computeVertexNormals();
    const Ce = c({
        THREE: THREE,
        lowPower: i.lowPower,
        qualityProfile: i.profile,
        chooseAnisotropy: P,
      }),
      Ie = new THREE.Mesh(
        ve,
        new THREE.MeshStandardMaterial({
          color: l.color,
          map: Ce.colorMap,
          bumpMap: Ce.bumpMap,
          bumpScale: i.lowPower ? l.bumpScale.lowPower : l.bumpScale.default,
          roughness: l.roughness,
          metalness: l.metalness,
        }),
      );
    ((Ie.rotation.x = -Math.PI / 2), (Ie.receiveShadow = !i.lowPower), ye.add(Ie));
    if (createGroundOverlayTexture) {
      const e = createGroundOverlayTexture({
        THREE: THREE,
        lowPower: i.lowPower,
        qualityProfile: i.profile,
      });
      if (e) {
        const overlayGeom = new THREE.CircleGeometry(70, i.profile.geometry.overlaySegments),
          overlayPos = overlayGeom.attributes.position;
        for (let e = 0; e < overlayPos.count; e += 1) {
          const t = overlayPos.getX(e),
            o = overlayPos.getY(e);
          overlayPos.setZ(e, a(t, o) + 0.04);
        }
        overlayPos.needsUpdate = !0;
        const t = new THREE.Mesh(
          overlayGeom,
          new THREE.MeshBasicMaterial({
            map: e,
            transparent: !0,
            opacity: 0.92,
            depthWrite: !1,
          }),
        );
        ((t.rotation.x = -Math.PI / 2), (t.renderOrder = 1), ye.add(t));
      }
    }
    const ze = Math.atan2(18, 24) + Math.PI,
      Ge = new THREE.Group(),
      Be = [
        new THREE.MeshStandardMaterial({ color: 9079432, roughness: 0.92, metalness: 0.02 }),
        new THREE.MeshStandardMaterial({ color: 8026744, roughness: 0.95, metalness: 0.01 }),
        new THREE.MeshStandardMaterial({ color: 10131605, roughness: 0.9, metalness: 0.03 }),
        new THREE.MeshStandardMaterial({ color: 11048056, roughness: 0.94, metalness: 0.01 }),
        new THREE.MeshStandardMaterial({ color: 12099720, roughness: 0.88, metalness: 0.02 }),
        new THREE.MeshStandardMaterial({ color: 9337442, roughness: 0.96, metalness: 0.01 }),
        new THREE.MeshStandardMaterial({ color: 6975608, roughness: 0.93, metalness: 0.04 }),
        new THREE.MeshStandardMaterial({ color: 7896710, roughness: 0.91, metalness: 0.03 }),
        new THREE.MeshStandardMaterial({ color: 4868166, roughness: 0.97, metalness: 0.02 }),
        new THREE.MeshStandardMaterial({ color: 5657168, roughness: 0.95, metalness: 0.01 }),
        new THREE.MeshStandardMaterial({ color: 9070680, roughness: 0.94, metalness: 0.01 }),
        new THREE.MeshStandardMaterial({ color: 8028776, roughness: 0.96, metalness: 0.01 }),
        new THREE.MeshStandardMaterial({ color: 11907236, roughness: 0.86, metalness: 0.02 }),
        new THREE.MeshStandardMaterial({ color: 12761776, roughness: 0.84, metalness: 0.03 }),
      ],
      Ae = [
        function (e) {
          return new THREE.DodecahedronGeometry(e, 0);
        },
        function (e) {
          return new THREE.IcosahedronGeometry(e, 0);
        },
        function (e) {
          return new THREE.OctahedronGeometry(e, 0);
        },
        function (e) {
          return new THREE.TetrahedronGeometry(e, 0);
        },
        function (e) {
          return new THREE.DodecahedronGeometry(e, 1);
        },
        function (e) {
          return new THREE.IcosahedronGeometry(e, 1);
        },
      ],
      Fe = i.profile.counts.haloTwisters;
    for (let e = 0; e < Fe; e++) {
      const t = 9100 + 43 * e,
        o = Qe(t),
        r = Qe(t + 11),
        n = Qe(t + 23),
        s = Qe(t + 37),
        l = Qe(t + 51),
        h = Qe(t + 67),
        c = 0.2 + 1.2 * o,
        d = Ae[Math.floor(h * Ae.length)](c),
        w = new THREE.Mesh(d, Be[Math.floor(l * Be.length)]),
        p = ze + (r - 0.5) * Math.PI * 1.8,
        M = 14 + 80 * n,
        E = Math.cos(p) * M,
        m = Math.sin(p) * M,
        u = a(E, m);
      var We, ke;
      (s < 0.25
        ? ((We = 1.2 + 0.8 * r), (Ye = 0.25 + 0.25 * l), (ke = 1 + 0.7 * h))
        : s < 0.45
          ? ((We = 0.5 + 0.3 * r), (Ye = 1.2 + 1 * l), (ke = 0.5 + 0.3 * h))
          : s < 0.65
            ? ((We = 1 + 0.6 * r), (Ye = 0.6 + 0.4 * l), (ke = 0.8 + 0.5 * h))
            : ((We = 0.8 + 0.4 * r), (Ye = 0.7 + 0.5 * l), (ke = 0.8 + 0.4 * h)),
        w.scale.set(We, Ye, ke),
        w.position.set(E, u + c * Ye * 0.45, m),
        w.rotation.set(0.4 * s, l * Math.PI * 2, 0.3 * o),
        (w.castShadow = !i.lowPower),
        (w.receiveShadow = !i.lowPower),
        Ge.add(w));
    }
    const $e = i.lowPower ? 28 : 55;
    for (let e = 0; e < $e; e++) {
      const t = 9500 + 37 * e,
        o = Qe(t),
        r = Qe(t + 13),
        n = Qe(t + 27),
        s = Qe(t + 41),
        i = Qe(t + 59),
        l = 0.06 + 0.35 * o,
        h = Ae[Math.floor(i * Ae.length)](l),
        c = new THREE.Mesh(h, Be[Math.floor(s * Be.length)]),
        d = ze + (r - 0.5) * Math.PI * 2,
        w = 10 + 85 * n,
        p = Math.cos(d) * w,
        M = Math.sin(d) * w,
        E = a(p, M);
      var Ye = 0.3 + 0.7 * n;
      (c.scale.set(0.8 + 0.8 * r, Ye, 0.8 + 0.6 * i),
        c.position.set(p, E + l * Ye * 0.4, M),
        c.rotation.set(0.3 * n, s * Math.PI * 2, 0.2 * o),
        Ge.add(c));
    }
    const De = i.lowPower ? 40 : 80;
    for (let e = 0; e < De; e++) {
      const t = 9900 + 29 * e,
        o = Qe(t),
        r = Qe(t + 11),
        n = Qe(t + 23),
        s = Qe(t + 39),
        i = 0.03 + 0.12 * o,
        l = Math.floor(4 * s),
        h = new THREE.Mesh(Ae[l](i), Be[Math.floor(s * Be.length)]),
        c = ze + (r - 0.5) * Math.PI * 2,
        d = 8 + 90 * n,
        w = Math.cos(c) * d,
        p = Math.sin(c) * d;
      ((Ye = 0.3 + 0.7 * r),
        h.scale.set(0.7 + 0.8 * o, Ye, 0.7 + 0.6 * n),
        h.position.set(w, a(w, p) + i * Ye * 0.35, p),
        Ge.add(h));
    }
    (ye.add(Ge),
      setShadowParticipation(Ge),
      (function () {
        const e = 128,
          t = document.createElement("canvas");
        ((t.width = e), (t.height = e));
        const o = t.getContext("2d");
        ((o.fillStyle = "#6a6864"), o.fillRect(0, 0, e, e));
        for (let t = 0; t < 200; t++) {
          const a = Qe(7700 + t) * e,
            r = Qe(7701 + t) * e,
            n = 2 + 8 * Qe(7702 + t),
            s = Math.floor(70 + 80 * Qe(7703 + t));
          ((o.fillStyle = `rgba(${s}, ${s - 4}, ${s - 8}, 0.3)`),
            o.beginPath(),
            o.arc(a, r, n, 0, 2 * Math.PI),
            o.fill());
        }
        for (let t = 0; t < 30; t++) {
          const a = Qe(7800 + t) * e,
            r = Qe(7801 + t) * e,
            n = a + 40 * (Qe(7802 + t) - 0.5),
            s = r + 40 * (Qe(7803 + t) - 0.5);
          ((o.strokeStyle = `rgba(30, 28, 25, ${0.15 + 0.2 * Qe(7804 + t)})`),
            (o.lineWidth = 0.5 + 2 * Qe(7805 + t)),
            o.beginPath(),
            o.moveTo(a, r),
            o.lineTo(n, s),
            o.stroke());
        }
        for (let t = 0; t < 15; t++) {
          const a = Qe(7900 + t) * e,
            r = Qe(7901 + t) * e,
            n = 3 + 6 * Qe(7902 + t);
          ((o.fillStyle = `rgba(120, 130, 100, ${0.08 + 0.12 * Qe(7903 + t)})`),
            o.beginPath(),
            o.arc(a, r, n, 0, 2 * Math.PI),
            o.fill());
        }
        const r = new THREE.CanvasTexture(t);
        r.encoding = THREE.sRGBEncoding;
        const n = document.createElement("canvas");
        ((n.width = e), (n.height = e));
        const s = n.getContext("2d");
        ((s.fillStyle = "#b0b0b0"), s.fillRect(0, 0, e, e));
        for (let t = 0; t < 400; t++) {
          const o = Qe(7500 + t) * e,
            a = Qe(7501 + t) * e,
            r = 1 + 6 * Qe(7502 + t),
            n = Math.floor(80 + 100 * Qe(7503 + t));
          ((s.fillStyle = `rgb(${n},${n},${n})`),
            s.beginPath(),
            s.arc(o, a, r, 0, 2 * Math.PI),
            s.fill());
        }
        const l = new THREE.CanvasTexture(n),
          h = new THREE.DodecahedronGeometry(2.5, 1),
          c = h.attributes.position;
        for (let e = 0; e < c.count; e++) {
          const t = c.getX(e),
            o = c.getY(e),
            a = c.getZ(e),
            r = 0.35 * Qe(8800 + 3.7 * e) - 0.15;
          (c.setX(e, t * (1 + r)),
            c.setY(e, o * (0.7 + 0.25 * Qe(8801 + 2.3 * e))),
            c.setZ(e, a * (1 + 0.3 * Qe(8802 + 1.9 * e) - 0.12)));
        }
        h.computeVertexNormals();
        const d = new THREE.Mesh(
            h,
            new THREE.MeshStandardMaterial({
              color: 7894386,
              map: r,
              bumpMap: l,
              bumpScale: 0.15,
              roughness: 0.98,
              metalness: 0.01,
            }),
          ),
          w = ze + 0.3,
          p = 28 * Math.cos(w),
          M = 28 * Math.sin(w);
        (d.position.set(p, a(p, M) + 1.2, M),
          d.rotation.set(0.1, 0.7, 0.15),
          (d.castShadow = !i.lowPower),
          (d.receiveShadow = !i.lowPower),
          ye.add(d));
      })());
    const Oe = new THREE.Group();
    ye.add(Oe);
    const qe = new THREE.SphereGeometry(1, i.lowPower ? 10 : 16, i.lowPower ? 8 : 12),
      Le = new THREE.CylinderGeometry(0.04, 0.08, 0.65, 5),
      Ve = document.createElement("canvas");
    ((Ve.width = i.lowPower ? 64 : 128), (Ve.height = i.lowPower ? 64 : 128));
    const Xe = Ve.getContext("2d");
    if (Xe) {
      ((Xe.fillStyle = "#808080"), Xe.fillRect(0, 0, Ve.width, Ve.height));
      const e = i.lowPower ? 200 : 600;
      for (let t = 0; t < e; t += 1) {
        const e = Math.random() * Ve.width,
          t = Math.random() * Ve.height,
          o = 1 + 3 * Math.random(),
          a = Math.floor(100 + 80 * Math.random());
        ((Xe.fillStyle = `rgb(${a}, ${a}, ${a})`),
          Xe.beginPath(),
          Xe.ellipse(e, t, o, 0.6 * o, Math.random() * Math.PI, 0, 2 * Math.PI),
          Xe.fill());
      }
    }
    const Ne = new THREE.CanvasTexture(Ve);
    ((Ne.wrapS = THREE.RepeatWrapping), (Ne.wrapT = THREE.RepeatWrapping), Ne.repeat.set(3, 3));
    const Ue = [
        new THREE.MeshStandardMaterial({
          color: 8687723,
          bumpMap: Ne,
          bumpScale: 0.08,
          roughness: 0.95,
          metalness: 0,
          emissive: 2304024,
          emissiveIntensity: 0.06,
        }),
        new THREE.MeshStandardMaterial({
          color: 9675129,
          bumpMap: Ne,
          bumpScale: 0.08,
          roughness: 0.95,
          metalness: 0,
          emissive: 2633757,
          emissiveIntensity: 0.05,
        }),
        new THREE.MeshStandardMaterial({
          color: 7503965,
          bumpMap: Ne,
          bumpScale: 0.08,
          roughness: 0.95,
          metalness: 0,
          emissive: 2040854,
          emissiveIntensity: 0.06,
        }),
        new THREE.MeshStandardMaterial({
          color: 9079386,
          bumpMap: Ne,
          bumpScale: 0.08,
          roughness: 0.93,
          metalness: 0,
          emissive: 2762776,
          emissiveIntensity: 0.05,
        }),
        new THREE.MeshStandardMaterial({
          color: 6981752,
          bumpMap: Ne,
          bumpScale: 0.08,
          roughness: 0.96,
          metalness: 0,
          emissive: 1714208,
          emissiveIntensity: 0.05,
        }),
        new THREE.MeshStandardMaterial({
          color: 10131552,
          bumpMap: Ne,
          bumpScale: 0.08,
          roughness: 0.92,
          metalness: 0,
          emissive: 3156500,
          emissiveIntensity: 0.06,
        }),
        new THREE.MeshStandardMaterial({
          color: 6189136,
          bumpMap: Ne,
          bumpScale: 0.08,
          roughness: 0.97,
          metalness: 0,
          emissive: 1580564,
          emissiveIntensity: 0.06,
        }),
        new THREE.MeshStandardMaterial({
          color: 8288850,
          bumpMap: Ne,
          bumpScale: 0.08,
          roughness: 0.94,
          metalness: 0,
          emissive: 2498578,
          emissiveIntensity: 0.05,
        }),
      ],
      Ze = new THREE.MeshStandardMaterial({
        color: 7701086,
        roughness: 1,
        metalness: 0,
        emissive: 2238488,
        emissiveIntensity: 0.04,
      }),
      je = new THREE.MeshStandardMaterial({
        color: 12888194,
        roughness: 0.88,
        metalness: 0.01,
        emissive: 3812896,
        emissiveIntensity: 0.04,
      });
    ([
      { x: -22, z: -10, scale: 1.5, variant: 0 },
      { x: 18, z: 14, scale: 1.6, variant: 1 },
      { x: -8, z: 22, scale: 1.4, variant: 2 },
      { x: 24, z: -16, scale: 1.3, variant: 0 },
      { x: -16, z: -20, scale: 1.5, variant: 1 },
      { x: -38, z: -28, scale: 1.9, variant: 0 },
      { x: 32, z: -40, scale: 2, variant: 1 },
      { x: -44, z: 14, scale: 2.2, variant: 2 },
      { x: 48, z: 8, scale: 2.1, variant: 0 },
      { x: -10, z: -48, scale: 1.8, variant: 1 },
      { x: 14, z: 50, scale: 2, variant: 2 },
      { x: -34, z: 36, scale: 1.7, variant: 0 },
      { x: 42, z: -22, scale: 1.9, variant: 2 },
      { x: -28, z: -44, scale: 2, variant: 1 },
      { x: 38, z: 30, scale: 1.8, variant: 0 },
      { x: -58, z: -40, scale: 2.4, variant: 0 },
      { x: 62, z: -24, scale: 2.3, variant: 1 },
      { x: -20, z: 65, scale: 2.5, variant: 2 },
      { x: 40, z: 55, scale: 2.1, variant: 0 },
      { x: -55, z: 38, scale: 2.2, variant: 1 },
      { x: 55, z: -52, scale: 2, variant: 2 },
      { x: -65, z: -8, scale: 2.6, variant: 0 },
      { x: 68, z: 18, scale: 2.3, variant: 1 },
      { x: -48, z: -58, scale: 2.1, variant: 2 },
      { x: 20, z: -68, scale: 2.4, variant: 0 },
      { x: -70, z: 28, scale: 2.5, variant: 1 },
      { x: 58, z: 42, scale: 2, variant: 2 },
      { x: -78, z: -22, scale: 2.8, variant: 0 },
      { x: 75, z: -44, scale: 2.6, variant: 1 },
      { x: 48, z: 72, scale: 2.5, variant: 0 },
      { x: 78, z: 8, scale: 2.4, variant: 2 },
    ].forEach((e) => {
      !(function (e, t, o, r = 0) {
        const n = new THREE.Group(),
          s = Math.abs(73 * e + 137 * t + 31 * r),
          i = function (e) {
            return Qe(s + e);
          },
          l = 4 + Math.floor(5 * i(1)),
          h = 0.5 + 1 * i(2),
          c = 0.6 + 0.8 * i(3);
        var d = 2 + Math.floor(3 * i(110));
        for (let e = 0; e < d; e++) {
          var w = (e / d) * Math.PI * 2 + 1.2 * i(120 + e),
            p = (0.4 + 0.5 * i(130 + e)) * o * h,
            M = (0.03 + 0.03 * i(140 + e)) * o,
            E = 0.15 + 0.35 * i(150 + e),
            m = new THREE.CylinderGeometry(0.5 * M, M, p, 5),
            u = new THREE.Mesh(m, je),
            g = i(160 + e) * c * 0.25 * o;
          (u.position.set(Math.cos(w) * g, 0.4 * p, Math.sin(w) * g),
            u.rotation.set(Math.sin(w) * E, w, Math.cos(w) * E),
            (u.castShadow = !1),
            (u.receiveShadow = !1),
            n.add(u));
        }
        for (let e = 0; e < l; e++) {
          const t = (e / l) * Math.PI * 2 + 0.8 * i(10 + e),
            a = (0.3 + 0.7 * i(20 + e)) * c,
            r = Math.cos(t) * a,
            s = Math.sin(t) * a,
            d = 0.4 * i(30 + e) * h;
          var f = 0.5 + 0.7 * i(40 + e),
            T = (0.4 + 0.5 * i(50 + e)) * h,
            R = 0.5 + 0.6 * i(60 + e);
          const w = Math.floor(i(70 + e) * Ue.length),
            p = new THREE.Mesh(qe, Ue[w]);
          (p.position.set(r * o, d * o, s * o),
            p.scale.set(o * f, o * T, o * R),
            (p.castShadow = !1),
            (p.receiveShadow = !1),
            n.add(p));
        }
        var b = 2 + Math.floor(3 * i(80));
        for (let e = 0; e < b; e++) {
          const t = new THREE.Mesh(Le, Ze);
          var P = i(90 + e) * Math.PI * 2,
            S = i(95 + e) * c * 0.4;
          (t.position.set(
            Math.cos(P) * S * o,
            (0.5 + 0.3 * i(100 + e)) * h * o,
            Math.sin(P) * S * o,
          ),
            (t.rotation.z = 0.3 * (i(105 + e) - 0.5)),
            (t.castShadow = !1),
            (t.receiveShadow = !1),
            n.add(t));
        }
        (n.position.set(e, a(e, t) + 0.08 * o, t), Oe.add(n));
      })(e.x, e.z, e.scale, e.variant);
    }),
      (function (e, t, o = 1) {
        const r = new THREE.Group(),
          n = document.createElement("canvas");
        ((n.width = i.lowPower ? 128 : 256), (n.height = i.lowPower ? 64 : 128));
        const s = n.getContext("2d");
        if (s) {
          ((s.fillStyle = "#8a6e52"), s.fillRect(0, 0, n.width, n.height));
          const e = i.lowPower ? 80 : 200;
          for (let t = 0; t < e; t += 1) {
            const e = Math.random() * n.height,
              t = Math.floor(40 + 45 * Math.random());
            ((s.fillStyle = `rgba(${t}, ${Math.max(20, t - 18)}, ${Math.max(12, t - 24)}, ${0.1 + 0.15 * Math.random()})`),
              s.fillRect(0, e, n.width, 1 + Math.floor(2 * Math.random())));
          }
          s.lineWidth = 1.5;
          for (let e = 0; e < 20; e += 1) {
            const e = Math.random() * n.width,
              t = Math.random() * n.height * 0.3,
              o = n.height * (0.3 + 0.5 * Math.random());
            ((s.strokeStyle = `rgba(28, 16, 8, ${0.15 + 0.2 * Math.random()})`),
              s.beginPath(),
              s.moveTo(e, t),
              s.quadraticCurveTo(
                e + 8 * (Math.random() - 0.5),
                t + 0.5 * o,
                e + 4 * (Math.random() - 0.5),
                t + o,
              ),
              s.stroke());
          }
          for (let e = 0; e < 8; e += 1) {
            const e = Math.random() * n.width,
              t = Math.random() * n.height,
              o = 3 + 8 * Math.random();
            ((s.fillStyle = `rgba(36, 22, 12, ${0.1 + 0.15 * Math.random()})`),
              s.beginPath(),
              s.ellipse(e, t, o, 0.6 * o, Math.random() * Math.PI, 0, 2 * Math.PI),
              s.fill());
          }
        }
        const l = new THREE.CanvasTexture(n);
        ((l.wrapS = THREE.RepeatWrapping),
          (l.wrapT = THREE.RepeatWrapping),
          l.repeat.set(1.5, 2),
          (l.encoding = THREE.sRGBEncoding));
        const h = new THREE.MeshStandardMaterial({
            color: 10123868,
            map: l,
            roughness: 0.96,
            metalness: 0.01,
          }),
          c = new THREE.MeshStandardMaterial({
            color: 8282952,
            map: l,
            roughness: 1,
            metalness: 0.01,
          }),
          d = new THREE.MeshStandardMaterial({
            color: 7307098,
            roughness: 1,
            metalness: 0,
            emissive: 1909784,
            emissiveIntensity: 0.05,
          }),
          w = new THREE.Mesh(
            new THREE.CylinderGeometry(0.9 * o, 1.25 * o, 8.2 * o, i.lowPower ? 7 : 12),
            h,
          );
        ((w.position.y = 4.1 * o),
          (w.rotation.z = -0.08),
          (w.castShadow = !i.lowPower),
          (w.receiveShadow = !i.lowPower),
          r.add(w));
        const p = new THREE.Mesh(
          new THREE.CylinderGeometry(0.45 * o, 0.72 * o, 5.8 * o, i.lowPower ? 6 : 11),
          c,
        );
        (p.position.set(0.45 * o, 9 * o, -0.12 * o),
          (p.rotation.z = 0.22),
          (p.rotation.x = -0.05),
          (p.castShadow = !i.lowPower),
          (p.receiveShadow = !i.lowPower),
          r.add(p),
          [
            { x: 0.7, y: 10.4, z: 0.15, ry: 0.2, rz: -0.66, len: 3.8, rTop: 0.17, rBase: 0.24 },
            { x: -0.25, y: 8.9, z: -0.25, ry: -0.6, rz: 0.52, len: 3.1, rTop: 0.14, rBase: 0.2 },
            { x: 0.28, y: 7.7, z: -0.45, ry: 0.92, rz: -0.38, len: 2.8, rTop: 0.13, rBase: 0.19 },
            { x: -0.6, y: 11.2, z: 0.35, ry: -0.35, rz: 0.72, len: 2.4, rTop: 0.11, rBase: 0.16 },
            { x: 0.55, y: 9.6, z: -0.6, ry: 1.4, rz: -0.48, len: 2.1, rTop: 0.1, rBase: 0.15 },
          ].forEach((e) => {
            const t = new THREE.Mesh(
              new THREE.CylinderGeometry(e.rTop * o, e.rBase * o, e.len * o, i.lowPower ? 5 : 7),
              c,
            );
            (t.position.set(e.x * o, e.y * o, e.z * o),
              (t.rotation.y = e.ry),
              (t.rotation.z = e.rz),
              (t.castShadow = !i.lowPower),
              (t.receiveShadow = !i.lowPower),
              r.add(t));
          }),
          [
            { x: 1.55, y: 12.35, z: 0.32, sx: 1.9, sy: 1.4, sz: 1.5 },
            { x: 0.52, y: 12.95, z: -0.62, sx: 2.15, sy: 1.55, sz: 1.9 },
            { x: -0.45, y: 11.6, z: -0.45, sx: 1.55, sy: 1.3, sz: 1.5 },
            { x: 1.05, y: 11.15, z: -1.02, sx: 1.25, sy: 1, sz: 1.1 },
            { x: -0.85, y: 12.6, z: 0.48, sx: 1.35, sy: 1.15, sz: 1.25 },
            { x: 0.95, y: 13.25, z: 0.1, sx: 1.45, sy: 1.1, sz: 1.3 },
          ].forEach((e, t) => {
            const a = new THREE.Mesh(
              new THREE.SphereGeometry(1 * o, i.lowPower ? 8 : 12, i.lowPower ? 7 : 10),
              t % 2 == 0 ? d : d.clone(),
            );
            (t % 2 == 1 && (a.material.color = new THREE.Color(8359270)),
              a.position.set(e.x * o, e.y * o, e.z * o),
              a.scale.set(e.sx, e.sy, e.sz),
              (a.castShadow = !i.lowPower),
              (a.receiveShadow = !i.lowPower),
              r.add(a));
          }),
          [
            { angle: 0.4, len: 3.2, rBase: 0.38, rTip: 0.12, tilt: 0.62 },
            { angle: 2.3, len: 2.8, rBase: 0.34, rTip: 0.1, tilt: 0.55 },
            { angle: 4.1, len: 3.5, rBase: 0.42, rTip: 0.14, tilt: 0.68 },
          ].forEach((e) => {
            const t = new THREE.Mesh(
                new THREE.CylinderGeometry(e.rTip * o, e.rBase * o, e.len * o, i.lowPower ? 4 : 6),
                c,
              ),
              a = 1.1 * Math.cos(e.angle) * o,
              n = 1.1 * Math.sin(e.angle) * o;
            (t.position.set(a, 0.3 * o, n),
              (t.rotation.z = Math.cos(e.angle) * e.tilt),
              (t.rotation.x = -Math.sin(e.angle) * e.tilt),
              (t.castShadow = !i.lowPower),
              (t.receiveShadow = !i.lowPower),
              r.add(t));
          }));
        const M = a(e, t);
        (r.position.set(e, M, t), ye.add(r));
      })(-42, 28, i.lowPower ? 1.25 : 1.5));
    const _e = new THREE.Group();
    function Qe(e) {
      const t = 43758.5453123 * Math.sin(12.9898 * e);
      return t - Math.floor(t);
    }
    function Je(e = 0) {
      const t = document.createElement("canvas");
      ((t.width = 256), (t.height = 128));
      const o = t.getContext("2d");
      if (!o) return null;
      o.clearRect(0, 0, t.width, t.height);
      const a = 5 + (e % 3);
      for (let r = 0; r < a; r += 1) {
        const n = r / Math.max(1, a - 1),
          s = t.width * (0.16 + 0.68 * n + 0.05 * (0.5 * Math.sin(1.21 * (r + e)) + 0.5)),
          i = t.height * (0.48 + 0.1 * (Math.sin(0.87 * (r + 3 + e)) - 0.2)),
          l = t.width * (0.12 + 0.11 * (0.5 * Math.sin(1.73 * (r + e)) + 0.5)),
          h = t.height * (0.2 + 0.12 * (0.5 * Math.sin(2.11 * (r + e)) + 0.5)),
          c = o.createRadialGradient(
            s - 0.18 * l,
            i - 0.2 * h,
            0.08 * h,
            s,
            i,
            1.08 * Math.max(l, h),
          );
        (c.addColorStop(0, "rgba(253, 244, 230, 0.78)"),
          c.addColorStop(0.65, "rgba(236, 223, 206, 0.42)"),
          c.addColorStop(1, "rgba(220, 204, 184, 0)"),
          (o.fillStyle = c),
          o.beginPath(),
          o.ellipse(s, i, l, h, 0, 0, 2 * Math.PI),
          o.fill());
      }
      const r = new THREE.CanvasTexture(t);
      return (
        (r.encoding = THREE.sRGBEncoding),
        (r.anisotropy = P(1, 2)),
        (r.minFilter = THREE.LinearFilter),
        (r.magFilter = THREE.LinearFilter),
        (r.generateMipmaps = !1),
        r
      );
    }
    ye.add(_e);
    const Ke = new THREE.Group();
    S.add(Ke);
    const et = [],
      tt = i.profile.counts.upperGlowSprites;
    for (let e = 0; e < tt; e += 1) {
      const t = Qe(903 + 1.37 * e),
        o = Qe(917 + 2.11 * e),
        a = Qe(931 + 2.91 * e),
        r = Qe(947 + 3.67 * e),
        n = Je(e);
      if (!n) continue;
      const s = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: n,
            color: 14734570,
            transparent: !0,
            opacity: i.lowPower ? 0.14 : 0.18,
            depthWrite: !1,
            rotation: 0.5 * (r - 0.5),
          }),
        ),
        l = t * Math.PI * 2,
        h = 72 + 36 * o;
      s.position.set(Math.cos(l) * h, 24 + 34 * a, Math.sin(l) * h);
      const c = (i.lowPower ? 18 : 25) + r * (i.lowPower ? 14 : 25);
      (s.scale.set(c, c * (0.42 + 0.2 * o), 1),
        Ke.add(s),
        et.push({
          mesh: s,
          yaw: l,
          radius: h,
          baseY: s.position.y,
          phase: t * Math.PI * 2,
          speed: 0.008 + 0.016 * a,
        }));
    }
    const upperGlowSystem = registerDecorativeSystem({
      getCenter(target) {
        return Ke.getWorldPosition(target);
      },
      group: Ke,
      importance: "midAtmosphere",
      name: "upperGlow",
      radius: 118,
    });
    setShadowParticipation(Ke);
    const ot = new THREE.Group();
    S.add(ot);
    const at = [];
    function rt(e, t, o, a) {
      a = a || "mid";
      const r = document.createElement("canvas");
      ((r.width = t), (r.height = o));
      const n = r.getContext("2d"),
        s = function (e) {
          return Qe(e);
        },
        i = [
          ["rgba(245,220,215,A)", "rgba(230,200,210,A)", "rgba(255,240,235,A)"],
          ["rgba(220,210,240,A)", "rgba(240,230,250,A)", "rgba(255,245,255,A)"],
          ["rgba(235,225,215,A)", "rgba(250,240,230,A)", "rgba(255,250,245,A)"],
          ["rgba(210,200,230,A)", "rgba(235,215,235,A)", "rgba(250,240,248,A)"],
        ],
        l = i[e % i.length];
      var h = "back" === a ? 0.7 : "front" === a ? 1.3 : 1;
      const c = 12 + Math.floor(10 * s(e + 99));
      for (let a = 0; a < 3; a++)
        for (let r = 0; r < c; r++) {
          const i = 100 * e + 200 * a + 37 * r,
            c = t * (0.15 + 0.7 * s(i)),
            d = o * (0.2 + 0.6 * s(i + 1)),
            w = t * (0.15 + 0.32 * s(i + 2)),
            p = o * (0.1 + 0.2 * s(i + 3)),
            M = (0.04 + 0.14 * s(i + 4)) * h,
            E = l[a % l.length].replace("A", M.toFixed(3));
          (n.save(), n.translate(c, d), n.rotate(0.4 * (s(i + 5) - 0.5)), n.scale(1, p / w));
          const m = n.createRadialGradient(0, 0, 0, 0, 0, w);
          (m.addColorStop(0, E),
            m.addColorStop(0.25, E.replace(M.toFixed(3), (0.85 * M).toFixed(3))),
            m.addColorStop(0.5, E.replace(M.toFixed(3), (0.55 * M).toFixed(3))),
            m.addColorStop(0.75, E.replace(M.toFixed(3), (0.2 * M).toFixed(3))),
            m.addColorStop(1, "rgba(255,255,255,0)"),
            (n.fillStyle = m),
            n.beginPath(),
            n.arc(0, 0, w, 0, 2 * Math.PI),
            n.fill(),
            n.restore());
        }
      var d = "front" === a ? 0.25 : "back" === a ? 0.06 : 0.15,
        w = "front" === a ? 12 : 8;
      for (let r = 0; r < w; r++) {
        const i = 77 * e + 53 * r,
          l = t * (0.3 + 0.4 * s(i)),
          h = o * (0.15 + s(i + 1) * ("front" === a ? 0.25 : 0.3)),
          c = t * (0.06 + s(i + 2) * ("front" === a ? 0.13 : 0.1)),
          w = n.createRadialGradient(l, h, 0, l, h, c);
        (w.addColorStop(0, "rgba(255,252,248," + d + ")"),
          w.addColorStop(1, "rgba(255,255,255,0)"),
          (n.fillStyle = w),
          n.beginPath(),
          n.arc(l, h, c, 0, 2 * Math.PI),
          n.fill());
      }
      var p = "back" === a ? 0.22 : "front" === a ? 0.03 : 0.11;
      const M = n.createLinearGradient(0, 0, 0, o);
      (M.addColorStop(0, "rgba(116,120,156,0)"),
        M.addColorStop(0.45, "rgba(116,120,156,0)"),
        M.addColorStop(0.6, "rgba(116,120,156," + (0.08 * p).toFixed(3) + ")"),
        M.addColorStop(0.75, "rgba(116,120,156," + (0.28 * p).toFixed(3) + ")"),
        M.addColorStop(0.88, "rgba(108,112,150," + (0.58 * p).toFixed(3) + ")"),
        M.addColorStop(1, "rgba(98,104,142," + p.toFixed(3) + ")"),
        (n.fillStyle = M),
        n.fillRect(0, 0, t, o),
        (n.globalCompositeOperation = "destination-in"));
      const E = document.createElement("canvas");
      ((E.width = t), (E.height = o));
      const m = E.getContext("2d"),
        u = t / 2,
        g = o / 2,
        f = 0.44 * t,
        T = 0.44 * o;
      (m.save(), m.translate(u, g), m.scale(f / T, 1));
      const R = m.createRadialGradient(0, 0, 0.15 * T, 0, 0, T);
      (R.addColorStop(0, "rgba(255,255,255,1)"),
        R.addColorStop(0.45, "rgba(255,255,255,0.88)"),
        R.addColorStop(0.7, "rgba(255,255,255,0.45)"),
        R.addColorStop(0.88, "rgba(255,255,255,0.10)"),
        R.addColorStop(1, "rgba(255,255,255,0)"),
        (m.fillStyle = R),
        m.fillRect(-f, -T, 2 * f, 2 * T),
        m.restore(),
        n.drawImage(E, 0, 0),
        (n.globalCompositeOperation = "source-over"));
      const b = new THREE.CanvasTexture(r);
      return (
        (b.encoding = THREE.sRGBEncoding),
        (b.minFilter = THREE.LinearFilter),
        (b.magFilter = THREE.LinearFilter),
        (b.generateMipmaps = !1),
        b
      );
    }
    const nt = i.profile.counts.midCloudTextures,
      st = [];
    for (let e = 0; e < nt; e++) {
      const t = i.profile.textures.cloudAtlasSize,
        o = Math.floor(0.6 * t),
        a = 7 * e + 42;
      st.push({ mid: rt(a, t, o, "mid") });
    }
    const it = i.profile.counts.midCloudSprites;
    for (let e = 0; e < it; e++) {
      const t = 8800 + 31 * e,
        o = Qe(t),
        a = Qe(t + 17),
        r = Qe(t + 31),
        n = Qe(t + 47),
        s = Qe(t + 61),
        i = st[e % st.length],
        l = (e / it) * Math.PI * 2 + 1.6 * (o - 0.5),
        h = 58 + 42 * a,
        c = 20 + 40 * r + 14 * (n - 0.5),
        d = 26 + 28 * r,
        w = 1.4 + 0.8 * o,
        p = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: i.mid,
            transparent: !0,
            opacity: 0.55 + 0.28 * n,
            depthWrite: !1,
            fog: !1,
            rotation: 0.6 * (s - 0.5),
          }),
        );
      (p.scale.set(d * w, 0.6 * d, 1),
        p.position.set(Math.cos(l) * h, c, Math.sin(l) * h),
        ot.add(p),
        at.push({
          mesh: p,
          meshes: [p],
          yaw: l,
          radius: h,
          baseY: c,
          phase: o * Math.PI * 2,
          speed: 0.003 + 0.006 * a,
          baseOpacity: 0.55 + 0.28 * n,
        }));
    }
    const midCloudSystem = registerDecorativeSystem({
      getCenter(target) {
        return ot.getWorldPosition(target);
      },
      group: ot,
      importance: "midAtmosphere",
      name: "midClouds",
      radius: 112,
    });
    setShadowParticipation(ot);
    const lt = new THREE.Group();
    ye.add(lt);
    const ht = [],
      ct = (function () {
        const e = document.createElement("canvas");
        ((e.width = 96), (e.height = 96));
        const t = e.getContext("2d");
        if (!t) return null;
        t.clearRect(0, 0, e.width, e.height);
        for (let o = 0; o < 18; o += 1) {
          const a = o / Math.max(1, 17),
            r = e.width * (0.16 + 0.68 * a),
            n = e.height * (0.28 + 0.42 * (0.5 * Math.sin(1.29 * o) + 0.5)),
            s = (Math.sin(1.81 * o + 0.7) - 0.5) * e.width * 0.06;
          ((t.strokeStyle = `rgba(166, 178, 132, ${0.16 + 0.28 * (0.5 * Math.sin(0.77 * o) + 0.5)})`),
            (t.lineWidth = 1 + 1.1 * (0.5 * Math.sin(1.41 * o) + 0.5)),
            t.beginPath(),
            t.moveTo(r, 0.94 * e.height),
            t.quadraticCurveTo(r + 0.5 * s, 0.94 * e.height - 0.45 * n, r + s, 0.94 * e.height - n),
            t.stroke());
        }
        const o = new THREE.CanvasTexture(e);
        return ((o.encoding = THREE.sRGBEncoding), (o.anisotropy = P(1, 2)), o);
      })(),
      dt = i.profile.counts.groundPlantSprites;
    if (ct)
      for (let e = 0; e < dt; e += 1) {
        const t = Qe(1001 + 1.43 * e),
          o = Qe(1033 + 2.37 * e),
          r = Qe(1069 + 3.19 * e),
          n = t * Math.PI * 2,
          s = 16 + 60 * o,
          l = Math.cos(n) * s,
          h = Math.sin(n) * s,
          c = a(l, h) + 0.06,
          d = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: ct,
              color: 10398333,
              transparent: !0,
              opacity: i.lowPower ? 0.3 : 0.36,
              depthWrite: !1,
            }),
          ),
          w = (i.lowPower ? 0.85 : 1) + r * (i.lowPower ? 1.05 : 1.45);
        (d.position.set(l, c + 0.45 * w, h),
          d.scale.set(0.85 * w, w * (1.2 + 0.5 * o), 1),
          lt.add(d),
          ht.push({
            mesh: d,
            x: l,
            z: h,
            baseY: c + 0.45 * w,
            phase: t * Math.PI * 2,
            amp: 0.02 + 0.05 * o,
          }));
      }
    const wt = a(0, 0),
      pt = 0.32 * Math.PI,
      Mt = 0.88;
    if (ct) {
      const e = pt + Math.PI,
        t = i.lowPower ? 34 : 72;
      for (let o = 0; o < t; o += 1) {
        const t = Qe(1401 + 1.53 * o),
          r = Qe(1433 + 2.27 * o),
          n = Qe(1471 + 3.11 * o),
          s = e + 1.05 * (t - 0.5),
          l = 11.4 + 4.9 * r,
          h = Math.cos(s) * l,
          c = Math.sin(s) * l,
          d = a(h, c) + 0.05,
          w = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: ct,
              color: 10924161,
              transparent: !0,
              opacity: i.lowPower ? 0.3 : 0.37,
              depthWrite: !1,
            }),
          ),
          p = (i.lowPower ? 0.95 : 1.08) + n * (i.lowPower ? 1.15 : 1.5);
        (w.position.set(h, d + 0.45 * p, c),
          w.scale.set(0.82 * p, p * (1.24 + 0.46 * r), 1),
          lt.add(w),
          ht.push({
            mesh: w,
            x: h,
            z: c,
            baseY: d + 0.45 * p,
            phase: t * Math.PI * 2,
            amp: 0.024 + 0.05 * r,
          }));
      }
      const o = i.lowPower ? 4 : 7,
        r = i.lowPower ? 8 : 14;
      for (let t = 0; t < o; t += 1) {
        const o = Qe(1601 + 2.03 * t),
          n = Qe(1651 + 2.71 * t),
          s = Qe(1703 + 3.17 * t),
          l = e + 0.95 * (o - 0.5),
          h = 10.8 + 5.4 * n,
          c = Math.cos(l) * h,
          d = Math.sin(l) * h;
        for (let e = 0; e < r; e += 1) {
          const o = Qe(1801 + 23.1 * t + 1.49 * e),
            r = Qe(1861 + 17.7 * t + 2.13 * e),
            n = Qe(1931 + 19.9 * t + 2.87 * e),
            l = o * Math.PI * 2,
            h = 0.14 + r * (i.lowPower ? 0.75 : 1.1),
            w = c + Math.cos(l) * h,
            p = d + Math.sin(l) * h,
            M = a(w, p) + 0.05,
            E = new THREE.Sprite(
              new THREE.SpriteMaterial({
                map: ct,
                color: 11187588,
                transparent: !0,
                opacity: i.lowPower ? 0.33 : 0.41,
                depthWrite: !1,
              }),
            ),
            m = (i.lowPower ? 1 : 1.12) + n * (i.lowPower ? 1.25 : 1.7) + 0.16 * s;
          (E.position.set(w, M + 0.45 * m, p),
            E.scale.set(0.86 * m, m * (1.28 + 0.52 * r), 1),
            lt.add(E),
            ht.push({
              mesh: E,
              x: w,
              z: p,
              baseY: M + 0.45 * m,
              phase: o * Math.PI * 2,
              amp: 0.026 + 0.055 * r,
            }));
        }
      }
    }
    const Et = d({
      THREE: THREE,
      lowPower: i.lowPower,
      qualityProfile: i.profile,
      chooseAnisotropy: P,
      collapseYaw: pt,
      collapseSpread: Mt,
    });
    function mt(e, t) {
      return Math.abs(Math.atan2(Math.sin(e - t), Math.cos(e - t)));
    }
    const ut = [
      { angle: pt + 0.22 * (Qe(3101) - 0.5), spread: 0.42, strength: 1 },
      { angle: pt + 0.58 + 0.2 * (Qe(3102) - 0.5), spread: 0.32, strength: 0.72 },
      { angle: pt - 0.76 + 0.24 * (Qe(3103) - 0.5), spread: 0.36, strength: 0.78 },
    ];
    function gt(e, t) {
      const o = e.attributes.position;
      let a = 0,
        r = 0;
      for (let e = 0; e < o.count; e += 1) {
        const n = o.getX(e),
          s = o.getY(e),
          i = o.getZ(e);
        if ((s + 17) / 34 < 0.86) continue;
        if (Math.sqrt(n * n + i * i) < 6) continue;
        const l = mt(Math.atan2(i, n), t),
          h = Math.max(0, 1 - l / 0.32);
        h <= 0 || ((a += s * h), (r += h));
      }
      return r <= 0 ? -1 / 0 : a / r;
    }
    function baseEdgeErode(e, t = {}) {
      const {
          jitterRadial: o = 0.24,
          jitterVertical: a = 0.08,
          halfHeight: r = 1,
          seedOffset: n = 0,
        } = t,
        s = e.attributes.position;
      for (let e = 0; e < s.count; e += 1) {
        const t = s.getX(e),
          i = s.getY(e),
          l = s.getZ(e),
          h = Math.sqrt(t * t + l * l);
        if (h < 0.01) continue;
        const c = Math.abs(i) > 0.6 * r ? 1 : 0.35,
          d = Qe(n + 1.37 * e) - 0.5,
          w = Qe(n + 2.11 * e + 0.4) - 0.5,
          p = c * o * d,
          M = c * a * w;
        (s.setX(e, (t / h) * (h + p)),
          s.setZ(e, (l / h) * (h + p)),
          Math.abs(i) > 0.4 * r && s.setY(e, i + M));
      }
      ((s.needsUpdate = !0), e.computeVertexNormals());
    }
    const ftLowerGeom = new THREE.CylinderGeometry(17.4, 18.6, 1.2, 56, 1);
    baseEdgeErode(ftLowerGeom, {
      jitterRadial: 0.3,
      jitterVertical: 0.09,
      halfHeight: 0.6,
      seedOffset: 5100,
    });
    const ftLower = new THREE.Mesh(
      ftLowerGeom,
      new THREE.MeshStandardMaterial({
        color: h.plinthColor,
        map: Et.colorMap,
        bumpMap: Et.bumpMap,
        bumpScale: i.lowPower ? 0.1 : 0.22,
        roughness: 1,
        metalness: 0,
      }),
    );
    ((ftLower.position.y = wt + 0.1),
      (ftLower.receiveShadow = !i.lowPower),
      (ftLower.castShadow = !i.lowPower),
      _e.add(ftLower));
    const ftUpperGeom = new THREE.CylinderGeometry(15.8, 17.2, 1.4, 56, 1);
    baseEdgeErode(ftUpperGeom, {
      jitterRadial: 0.22,
      jitterVertical: 0.07,
      halfHeight: 0.7,
      seedOffset: 5200,
    });
    const ft = new THREE.Mesh(
      ftUpperGeom,
      new THREE.MeshStandardMaterial({
        color: h.plinthColor,
        map: Et.colorMap,
        bumpMap: Et.bumpMap,
        bumpScale: i.lowPower ? 0.1 : 0.22,
        roughness: 1,
        metalness: 0,
      }),
    );
    ((ft.position.y = wt + 1),
      (ft.receiveShadow = !i.lowPower),
      (ft.castShadow = !i.lowPower),
      _e.add(ft));
    const ftSeam = new THREE.Mesh(
      new THREE.TorusGeometry(17.1, 0.25, 8, 56),
      new THREE.MeshStandardMaterial({
        color: h.ringColor,
        map: Et.colorMap,
        bumpMap: Et.bumpMap,
        bumpScale: i.lowPower ? 0.02 : 0.05,
        roughness: 0.96,
        metalness: 0.05,
      }),
    );
    ((ftSeam.rotation.x = -Math.PI / 2),
      (ftSeam.position.y = wt + 0.72),
      (ftSeam.receiveShadow = !i.lowPower),
      _e.add(ftSeam));
    const ftSootGeom = new THREE.CylinderGeometry(18.7, 18.7, 0.6, 56, 1, !0),
      ftSoot = new THREE.Mesh(
        ftSootGeom,
        new THREE.MeshBasicMaterial({
          color: 1316882,
          transparent: !0,
          opacity: 0.18,
          side: THREE.DoubleSide,
          depthWrite: !1,
        }),
      );
    ((ftSoot.position.y = wt + 0.1), _e.add(ftSoot));
    const ftButtressCount = i.profile.counts.buttresses,
      ftButtressMaterial = new THREE.MeshStandardMaterial({
        color: h.plinthColor,
        map: Et.colorMap,
        bumpMap: Et.bumpMap,
        bumpScale: i.lowPower ? 0.08 : 0.2,
        roughness: 1,
        metalness: 0,
      });
    for (let e = 0; e < ftButtressCount; e += 1) {
      const t = (e / ftButtressCount) * Math.PI * 2 + 0.18 * (Qe(5300 + e) - 0.5),
        o = 1.1 + 0.6 * Qe(5310 + e),
        a = 1.6 + 0.5 * Qe(5320 + e),
        r = 0.9 + 0.35 * Qe(5330 + e),
        n = new THREE.Mesh(new THREE.BoxGeometry(o, a, r), ftButtressMaterial),
        s = 18.3;
      (n.position.set(Math.cos(t) * s, wt + 0.3 + 0.1 * Qe(5340 + e), Math.sin(t) * s),
        (n.rotation.y = t + Math.PI / 2 + 0.12 * (Qe(5350 + e) - 0.5)),
        (n.rotation.z = 0.06 * (Qe(5360 + e) - 0.5)),
        (n.castShadow = !i.lowPower),
        (n.receiveShadow = !i.lowPower),
        _e.add(n));
    }
    const Tt = new THREE.Mesh(
      new THREE.TorusGeometry(12.2, 0.6, 8, 40),
      new THREE.MeshStandardMaterial({
        color: h.ringColor,
        map: Et.colorMap,
        bumpMap: Et.bumpMap,
        bumpScale: i.lowPower ? 0.015 : 0.06,
        roughness: 0.98,
        metalness: 0.01,
      }),
    );
    ((Tt.rotation.x = -Math.PI / 2), (Tt.position.y = wt + 1.6), _e.add(Tt));
    const plinthTorchLight = new THREE.PointLight(16756340, 0.4, 16, 2);
    (plinthTorchLight.position.set(0, wt + 3, 0), _e.add(plinthTorchLight));
    const Rt = new THREE.CylinderGeometry(8.8, 12.2, 34, 34, 10, !0);
    (!(function (e, t = {}) {
      const {
          topStartRatio: o = 0.78,
          spread: a = 0.95,
          inwardStrength: n = 0.28,
          dropStrength: s = 0.22,
          jitterStrength: i = 0.22,
          shearStrength: l = 0.12,
          biteStrength: h = 0.12,
          maxInwardClamp: c = 0.34,
          maxDropClamp: d = 0.28,
          uvRelaxStrength: w = 0.32,
        } = t,
        p = e.attributes.position,
        M = e.attributes.uv || null;
      for (let e = 0; e < p.count; e += 1) {
        const t = p.getX(e),
          E = p.getY(e),
          m = p.getZ(e),
          u = (E + 17) / 34;
        if (u < o) continue;
        const g = Math.atan2(m, t),
          f = r(Math.max(0, 1 - mt(g, pt) / a));
        if (f <= 0) continue;
        const T = r((u - o) / Math.max(1e-4, 1 - o)),
          R = Qe(1.37 * e + 22.4),
          b = Qe(2.11 * e + 40.2),
          P = Qe(3.79 * e + 17.3),
          S = Math.min(c, f * T * n * (0.84 + 0.52 * R)),
          H = Math.min(d, f * T * s * (0.86 + 0.44 * b)),
          y = 0.62 * (R - 0.5) * f * T * i,
          v = 0.58 * (b - 0.5) * f * T * l,
          x = Math.min(0.58 * d, Math.max(0, P - 0.58) * f * T * h);
        (p.setX(e, t * (1 - S) + Math.cos(g + 0.5 * Math.PI) * (y + v)),
          p.setZ(e, m * (1 - S) + Math.sin(g + 0.5 * Math.PI) * y - Math.cos(g) * v));
        const C = E - 34 * (H + x);
        if ((p.setY(e, C), M)) {
          const t = M.getY(e),
            o = Math.min(1, Math.max(0, (C + 17) / 34)),
            a = Math.min(1, f * T * w);
          M.setY(e, t + (o - t) * a);
        }
      }
      ((p.needsUpdate = !0), M && (M.needsUpdate = !0), e.computeVertexNormals());
    })(Rt, {
      topStartRatio: 0.76,
      spread: Mt,
      inwardStrength: i.lowPower ? 0.18 : 0.24,
      dropStrength: i.lowPower ? 0.13 : 0.18,
      jitterStrength: i.lowPower ? 0.11 : 0.16,
      shearStrength: i.lowPower ? 0.05 : 0.08,
      biteStrength: i.lowPower ? 0.05 : 0.08,
      maxInwardClamp: i.lowPower ? 0.26 : 0.29,
      maxDropClamp: i.lowPower ? 0.2 : 0.24,
      uvRelaxStrength: i.lowPower ? 0.26 : 0.34,
    }),
      (function (e) {
        const t = e.attributes.position;
        for (let e = 0; e < t.count; e += 1) {
          const o = t.getX(e),
            a = t.getY(e),
            r = t.getZ(e),
            n = (a + 17) / 34;
          if (n < 0.9) continue;
          const s = Math.atan2(r, o),
            i = Math.max(0, 1 - mt(s, pt) / 1.05);
          let l = 0;
          for (let e = 0; e < ut.length; e += 1) {
            const t = ut[e],
              o = Math.max(0, 1 - mt(s, t.angle) / t.spread) * t.strength;
            l = Math.max(l, o);
          }
          const h = Qe(3301 + 1.91 * Math.floor(((s + Math.PI) / (2 * Math.PI)) * 24)),
            c = 0.45 * Math.max(0, h - 0.55),
            d = Qe(2.03 * e + 211.1),
            w = Qe(2.87 * e + 307.4),
            p = Math.min(1, Math.max(0, (n - 0.9) / 0.1)),
            M = (0.11 + 0.3 * d) * p,
            E = i * (0.13 + 0.28 * w) * p,
            m = l * (0.11 + 0.22 * d) * p,
            u = c * (0.12 + 0.2 * l + 0.16 * i) * p,
            g = 5.2 * (M + E + m + 0.55 * u),
            f = 0.52 * M + 0.88 * E + 1.02 * m + 0.4 * u,
            T = Math.sqrt(o * o + r * r) || 1;
          (t.setY(e, a - g), t.setX(e, o * (1 - f / T)), t.setZ(e, r * (1 - f / T)));
        }
        ((t.needsUpdate = !0), e.computeVertexNormals());
      })(Rt));
    const bt = new THREE.Mesh(
      Rt,
      new THREE.MeshStandardMaterial({
        color: h.shellColor,
        map: Et.colorMap,
        bumpMap: Et.bumpMap,
        bumpScale: i.lowPower ? h.shellBumpScale.lowPower : h.shellBumpScale.default,
        roughness: 0.92,
        metalness: 0.03,
      }),
    );
    if (
      ((bt.position.y = wt + 18.5),
      (bt.castShadow = !i.lowPower),
      (bt.receiveShadow = !1),
      !i.lowPower)
    ) {
      const e = Rt.attributes.position,
        t = new Float32Array(3 * e.count),
        o = Math.atan2(18, 24);
      for (let a = 0; a < e.count; a += 1) {
        const r = e.getX(a),
          n = e.getZ(a),
          s = Math.atan2(n, r);
        let i = Math.abs(s - o);
        i > Math.PI && (i = 2 * Math.PI - i);
        let l = 0.52 + 0.48 * (1 - i / Math.PI);
        const h = e.getY(a),
          c = Math.abs(s - pt) % (2 * Math.PI),
          d = Math.min(c, 2 * Math.PI - c),
          w = Math.max(0, 1 - d / 0.616),
          p = (h + 17) / 34;
        (p > 0.6 && w > 0 && (l *= 1 - w * Math.min(1, (p - 0.6) / 0.3) * 0.48),
          p < 0.15 && (l *= 0.85 + (p / 0.15) * 0.15),
          (t[3 * a] = l),
          (t[3 * a + 1] = l),
          (t[3 * a + 2] = l));
      }
      (Rt.setAttribute("color", new THREE.BufferAttribute(t, 3)),
        (bt.material.vertexColors = !0),
        (bt.material.needsUpdate = !0));
    }
    function Pt(e, t, o, a, r, n, s, i, l) {
      var h = (function (e, t, o, a, r, n, s) {
          for (var i = [], l = e, h = 0; h <= a; h++) {
            var c = t + (h / a) * (o - t);
            ((l += (Qe(s + 7.3 * h) - 0.5) * r), (l += n / a), i.push({ angle: l, y: c }));
          }
          return i;
        })(e, t, o, a, r, n, l),
        c = (function (e, t, o, a, r) {
          if (e.length < 2) return null;
          for (
            var n = [],
              s = [],
              i = [],
              l = 26 / 255,
              h = 16 / 255,
              c = 8 / 255,
              d = 122 / 255,
              w = 98 / 255,
              p = 72 / 255,
              M = 0;
            M < e.length;
            M++
          ) {
            var E = e[M],
              m = 12.2 + (8.8 - 12.2) * ((E.y + 17) / 34),
              u = -Math.sin(E.angle),
              g = Math.cos(E.angle),
              f = Math.cos(E.angle),
              T = Math.sin(E.angle),
              R = Math.pow(Math.sin(Math.max(0.01, M / (e.length - 1)) * Math.PI), 0.5),
              b = a * R,
              P = m + 0.06,
              S = m - r * R;
            if (
              (n.push(f * P - u * b * 1.4, E.y, T * P - g * b * 1.4),
              n.push(f * S - u * b * 0.3, E.y, T * S - g * b * 0.3),
              n.push(f * S + u * b * 0.3, E.y, T * S + g * b * 0.3),
              n.push(f * P + u * b * 1.4, E.y, T * P + g * b * 1.4),
              s.push(d, w, p),
              s.push(l, h, c),
              s.push(l, h, c),
              s.push(d, w, p),
              M > 0)
            ) {
              var H = 4 * (M - 1);
              (i.push(H, H + 4, H + 1),
                i.push(H + 1, H + 4, H + 5),
                i.push(H + 1, H + 5, H + 2),
                i.push(H + 2, H + 5, H + 6),
                i.push(H + 2, H + 6, H + 3),
                i.push(H + 3, H + 6, H + 7));
            }
          }
          var y = new THREE.BufferGeometry();
          (y.setAttribute("position", new THREE.Float32BufferAttribute(n, 3)),
            y.setAttribute("color", new THREE.Float32BufferAttribute(s, 3)),
            y.setIndex(i),
            y.computeVertexNormals());
          var v = new THREE.MeshStandardMaterial({
            vertexColors: !0,
            roughness: 1,
            metalness: 0,
            side: THREE.DoubleSide,
            polygonOffset: !0,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
          });
          return new THREE.Mesh(y, v);
        })(h, 0, 0, s, i);
      return (c && ((c.position.y = bt.position.y), _e.add(c)), h);
    }
    _e.add(bt);
    var St = Pt(ze, -13, 11, 28, 0.08, 0.25, 0.07, 0.15, 7700);
    if (St) {
      var Ht = St[Math.floor(0.4 * St.length)];
      Pt(Ht.angle + 0.03, Ht.y, Ht.y + 3.5, 6, 0.05, 0.1, 0.035, 0.08, 7710);
      var yt = St[Math.floor(0.7 * St.length)];
      Pt(yt.angle - 0.02, yt.y, yt.y - 2, 5, 0.04, -0.12, 0.03, 0.07, 7715);
    }
    (Pt(pt + 0.66, -3, 6, 12, 0.06, 0.28, 0.05, 0.12, 7750),
      Pt(ze + 0.55 * Math.PI, 2, 3.5, 8, 0.03, 0.45, 0.04, 0.1, 7800),
      [
        [0.3, -8, -5, 5, 0.03, 0.06, 7820],
        [0.7, -2, 1, 4, 0.02, -0.05, 7825],
        [1.1, 4, 6, 5, 0.03, 0.08, 7830],
        [1.5, -6, -4, 4, 0.02, -0.1, 7835],
        [1.9, 0, 1.5, 3, 0.03, 0.18, 7840],
        [2.2, -10, -8, 4, 0.02, 0.04, 7845],
        [2.6, 6, 8, 4, 0.03, -0.06, 7850],
        [2.9, -4, -2, 4, 0.02, 0.12, 7855],
        [3.3, 1, 3, 4, 0.03, -0.08, 7860],
        [3.7, -12, -10, 4, 0.02, 0.05, 7865],
        [4, 3, 4.5, 3, 0.02, 0.22, 7870],
        [4.4, -7, -5, 4, 0.03, -0.04, 7875],
        [4.8, 8, 9.5, 3, 0.02, 0.06, 7880],
        [5.1, -1, 1, 4, 0.03, -0.14, 7885],
        [5.5, -14, -12, 4, 0.02, 0.03, 7890],
        [5.9, 5, 6.5, 3, 0.02, 0.1, 7895],
        [0.15, -3, -1, 3, 0.02, -0.18, 7900],
        [6, 0, 1, 3, 0.02, 0.25, 7905],
        [3.14, 2, 4, 4, 0.03, 0.05, 7910],
        [1.8, -15, -13, 4, 0.02, -0.03, 7915],
      ].forEach(function (e) {
        Pt(
          ze + e[0],
          e[1],
          e[2],
          e[3],
          e[4],
          e[5],
          0.015 + 0.02 * Qe(e[6]),
          0.04 + 0.06 * Qe(e[6] + 1),
          e[6],
        );
      }));
    const vt = new THREE.Mesh(
      new THREE.CylinderGeometry(8.2, 11.5, 33.6, 34, 6, !0),
      new THREE.MeshStandardMaterial({
        color: h.shellInnerColor,
        map: Et.colorMap,
        bumpMap: Et.bumpMap,
        bumpScale: i.lowPower ? 0.022 : 0.042,
        roughness: 0.98,
        metalness: 0,
        side: THREE.BackSide,
      }),
    );
    (vt.position.copy(bt.position),
      (vt.castShadow = !1),
      (vt.receiveShadow = !1),
      _e.add(vt),
      bt.position.y,
      (function (e) {
        const t = e.attributes.position;
        let o = -1 / 0;
        for (let e = 0; e < t.count; e += 1) o = Math.max(o, t.getY(e));
      })(Rt));
    {
      const craterRimLocal = gt(Rt, pt),
        craterRimWorld = Number.isFinite(craterRimLocal)
          ? bt.position.y + craterRimLocal
          : bt.position.y + 14,
        craterEmber = new THREE.PointLight(15311978, i.lowPower ? 0.35 : 0.55, 14, 2);
      (craterEmber.position.set(Math.cos(pt) * 4, craterRimWorld - 1.5, Math.sin(pt) * 4),
        (craterEmber.castShadow = !1),
        _e.add(craterEmber));
    }
    const xt = new THREE.Group();
    ((xt.position.y = bt.position.y), _e.add(xt));
    const Ct = new THREE.MeshStandardMaterial({
        color: 7227960,
        map: Et.colorMap,
        bumpMap: Et.bumpMap,
        bumpScale: i.lowPower ? 0.016 : 0.045,
        roughness: 0.95,
        metalness: 0.01,
      }),
      It = new THREE.MeshStandardMaterial({
        color: 4073504,
        map: Et.colorMap,
        bumpMap: Et.bumpMap,
        bumpScale: i.lowPower ? 0.018 : 0.038,
        roughness: 0.98,
        metalness: 0,
      }),
      zt = i.lowPower ? 14 : 28;
    for (let e = 0; e < zt; e += 1) {
      const t = (e / zt) * Math.PI * 2,
        o = Math.max(0, 1 - mt(t, pt) / 0.86);
      let a = 0;
      for (let e = 0; e < ut.length; e += 1) {
        const o = ut[e],
          r = Math.max(0, 1 - mt(t, o.angle) / o.spread) * o.strength;
        a = Math.max(a, r);
      }
      const r = 0.72 - 0.46 * o - 0.34 * a;
      if (Qe(2001 + 2.13 * e) > r) continue;
      const n = Qe(2101 + 1.73 * e),
        s = Qe(2201 + 2.41 * e),
        l = Qe(2301 + 3.07 * e),
        h = Qe(2401 + 3.81 * e),
        c = 7.15 + 0.75 * n - 0.34 * o - 0.2 * a,
        d = 1.15 + 0.88 * s,
        w = 0.54 + 0.68 * l,
        p = 0.9 + 0.66 * h,
        M = new THREE.Mesh(new THREE.BoxGeometry(d, w, p), Ct),
        E = gt(Rt, t);
      if (!Number.isFinite(E)) continue;
      const m = E - 0.72,
        u = E + 0.04,
        g = E - (0.26 + 0.18 * o + 0.12 * a + 0.07 * s);
      if (
        (M.position.set(Math.cos(t) * c, Math.min(u, Math.max(m, g)), Math.sin(t) * c),
        (M.rotation.y = -t + 0.5 * Math.PI + 0.12 * (l - 0.5)),
        (M.rotation.z = (s - 0.5) * (0.14 + 0.24 * o + 0.18 * a)),
        (M.rotation.x = (h - 0.5) * (0.1 + 0.08 * a)),
        (M.castShadow = !i.lowPower),
        (M.receiveShadow = !1),
        xt.add(M),
        n > 0.73 && o < 0.66 && a < 0.75)
      ) {
        const e = new THREE.Mesh(new THREE.BoxGeometry(0.42 * d, 0.42 * w, 0.58 * p), Ct),
          o = -Math.sin(t),
          a = Math.cos(t),
          r = 0.05 + 0.06 * l;
        (e.position.set(
          M.position.x + o * (0.08 + 0.12 * h),
          M.position.y + 0.08 * w - r,
          M.position.z + a * (0.08 + 0.12 * l),
        ),
          (e.rotation.y = M.rotation.y + 0.1 * (h - 0.5)),
          (e.rotation.z = 0.8 * M.rotation.z),
          (e.castShadow = !i.lowPower),
          (e.receiveShadow = !1),
          xt.add(e));
      }
    }
    const biteShardCount = i.lowPower ? 5 : 9;
    for (let e = 0; e < biteShardCount; e += 1) {
      const t = biteShardCount > 1 ? e / (biteShardCount - 1) : 0.5,
        o = Qe(6101 + 1.73 * e),
        a = Qe(6151 + 2.41 * e),
        r = Qe(6201 + 3.07 * e),
        n = Qe(6251 + 3.79 * e),
        s = pt + (t - 0.5) * 1.16 + 0.08 * (o - 0.5),
        l = gt(Rt, s);
      if (!Number.isFinite(l)) continue;
      const h = 0.5 + 0.3 * a,
        c = 0.3 + 0.2 * r,
        d = 0.35 + 0.25 * n,
        w = 7.6 + 0.35 * (a - 0.5),
        p = new THREE.Mesh(new THREE.BoxGeometry(h, c, d), Ct);
      (p.position.set(Math.cos(s) * w, l - 0.1 - 0.18 * o, Math.sin(s) * w),
        (p.rotation.y = -s + 0.5 * Math.PI + 0.18 * (r - 0.5)),
        (p.rotation.z = 0.35 * (a - 0.5)),
        (p.rotation.x = 0.14 * (n - 0.5)),
        (p.castShadow = !i.lowPower),
        (p.receiveShadow = !1),
        xt.add(p));
    }
    const reliefBrickMaterial = new THREE.MeshStandardMaterial({
        color: h.shellColor,
        map: Et.colorMap,
        bumpMap: Et.bumpMap,
        bumpScale: i.lowPower ? h.shellBumpScale.lowPower : h.shellBumpScale.default,
        roughness: 0.92,
        metalness: 0.03,
      }),
      reliefBrickCount = i.profile.counts.reliefBricks;
    for (let e = 0; e < reliefBrickCount; e += 1) {
      const o = Qe(7301 + 1.53 * e),
        a = Qe(7351 + 2.17 * e),
        r = Qe(7401 + 2.83 * e),
        n = Qe(7451 + 3.37 * e),
        s = Qe(7501 + 4.11 * e),
        angle = o * Math.PI * 2,
        biteDist = mt(angle, pt);
      if (biteDist < 0.78) continue;
      const yRatio = 0.44 + 0.42 * a,
        localY = -17 + 34 * yRatio,
        shellR = 12.2 - 3.4 * yRatio,
        w = 0.55 + 0.45 * r,
        bh = 0.3 + 0.2 * n,
        bd = 0.18 + 0.22 * s,
        radial = shellR + bd * 0.42,
        mesh = new THREE.Mesh(new THREE.BoxGeometry(w, bh, bd), reliefBrickMaterial);
      (mesh.position.set(
        Math.cos(angle) * radial,
        localY + 0.22 * (s - 0.5),
        Math.sin(angle) * radial,
      ),
        (mesh.rotation.y = -angle + 0.5 * Math.PI + 0.06 * (r - 0.5)),
        (mesh.rotation.z = 0.05 * (n - 0.5)),
        (mesh.castShadow = !i.lowPower),
        (mesh.receiveShadow = !i.lowPower),
        xt.add(mesh));
    }
    const Gt = i.lowPower ? 12 : 26;
    for (let e = 0; e < Gt; e += 1) {
      const t = Qe(3501 + 1.61 * e),
        o = Qe(3601 + 2.17 * e),
        a = Qe(3701 + 2.83 * e),
        r = Qe(3801 + 3.37 * e),
        n = t * Math.PI * 2,
        s = Math.max(0, 1 - mt(n, pt) / 0.9);
      let l = 0;
      for (let e = 0; e < ut.length; e += 1) {
        const t = ut[e];
        l = Math.max(l, Math.max(0, 1 - mt(n, t.angle) / t.spread) * t.strength);
      }
      if (o > 0.82 - 0.28 * s - 0.18 * l) continue;
      const h = gt(Rt, n);
      if (!Number.isFinite(h)) continue;
      const c = 0.28 + 0.56 * o,
        d = 0.18 + 0.32 * a,
        w = 0.22 + 0.48 * r,
        p = 7.05 + 0.95 * a - 0.32 * s,
        M = new THREE.Mesh(new THREE.BoxGeometry(c, d, w), Ct),
        E = 0.16 + 0.09 * s + 0.07 * l;
      (M.position.set(Math.cos(n) * p, h - E, Math.sin(n) * p),
        (M.rotation.y = -n + 0.5 * Math.PI + 0.18 * (a - 0.5)),
        (M.rotation.z = 0.24 * (r - 0.5)),
        (M.rotation.x = 0.12 * (o - 0.5)),
        (M.castShadow = !i.lowPower),
        (M.receiveShadow = !1),
        xt.add(M));
    }
    const Bt = [
        new THREE.MeshStandardMaterial({
          color: 3022356,
          map: Et.colorMap,
          bumpMap: Et.bumpMap,
          bumpScale: 0.03,
          roughness: 0.98,
        }),
        new THREE.MeshStandardMaterial({
          color: 5913128,
          map: Et.colorMap,
          bumpMap: Et.bumpMap,
          bumpScale: 0.03,
          roughness: 0.96,
        }),
        new THREE.MeshStandardMaterial({
          color: 7231554,
          map: Et.colorMap,
          bumpMap: Et.bumpMap,
          bumpScale: 0.025,
          roughness: 0.94,
        }),
        new THREE.MeshStandardMaterial({
          color: 4866104,
          map: Et.colorMap,
          bumpMap: Et.bumpMap,
          bumpScale: 0.028,
          roughness: 0.97,
        }),
      ],
      At = i.lowPower ? 10 : 28;
    for (let e = 0; e < At; e++) {
      const t = 5500 + 37 * e,
        o = Qe(t),
        a = Qe(t + 11),
        r = Qe(t + 23),
        n = Qe(t + 37),
        s = Qe(t + 49),
        l = pt + (o - 0.5) * Mt * 1.2,
        h = a > 0.4,
        c = 0.4 + 0.8 * r,
        d = 0.25 + 0.5 * n,
        w = 0.35 + 0.6 * s,
        p = e % 3 == 0 ? Bt[e % Bt.length] : h ? It : Ct,
        M = new THREE.Mesh(new THREE.BoxGeometry(c, d, w), p),
        E = gt(Rt, l);
      if (!Number.isFinite(E)) continue;
      const m = h ? 3.5 + 3.5 * r : 7.2 + 2.2 * n,
        u = E - 5.5 * (0.7 * a + 0.5 * r) - 2 * s;
      (M.position.set(Math.cos(l) * m, u, Math.sin(l) * m),
        M.rotation.set(1 * (o - 0.5), 0.8 * (a - 0.5) - l, 0.9 * (r - 0.5)),
        (M.castShadow = !i.lowPower),
        xt.add(M));
    }
    const Ft = i.lowPower ? 8 : 22;
    for (let e = 0; e < Ft; e++) {
      const t = 7700 + 41 * e,
        o = Qe(t),
        a = Qe(t + 13),
        r = Qe(t + 29),
        n = Qe(t + 43),
        s = pt + (o - 0.5) * Mt * 1,
        l = 0.3 + 0.7 * a,
        h = Bt[Math.floor(r * Bt.length)],
        c =
          n > 0.5
            ? new THREE.DodecahedronGeometry(l, 0)
            : new THREE.BoxGeometry(1.2 * l, 0.6 * l, 0.9 * l),
        d = new THREE.Mesh(c, h),
        w = gt(Rt, s);
      if (!Number.isFinite(w)) continue;
      const p = 6.5 + 3 * a;
      (d.position.set(Math.cos(s) * p, w - 3 * r - 0.5, Math.sin(s) * p),
        d.rotation.set(1.5 * o, 2 * a, 1.2 * r),
        (d.castShadow = !i.lowPower),
        xt.add(d));
    }
    const Wt = i.lowPower ? 8 : 24;
    for (let e = 0; e < Wt; e++) {
      const t = 6600 + 29 * e,
        o = Qe(t),
        a = Qe(t + 13),
        r = Qe(t + 27),
        n = Qe(t + 41),
        s = pt + (o - 0.5) * Mt * 1,
        i = 0.12 + 0.35 * a,
        l = 0.08 + 0.22 * r,
        h = 0.1 + 0.28 * n,
        c = Bt[Math.floor(a * Bt.length)],
        d = new THREE.Mesh(new THREE.BoxGeometry(i, l, h), c),
        w = gt(Rt, s);
      if (!Number.isFinite(w)) continue;
      const p = 4.5 + 4.5 * a;
      (d.position.set(Math.cos(s) * p, w - 7 * r - 0.8, Math.sin(s) * p),
        d.rotation.set(1.4 * o, 1.8 * a, 1.2 * r),
        xt.add(d));
    }
    const kt = (function () {
        const e = document.createElement("canvas");
        ((e.width = 128), (e.height = 128));
        const t = e.getContext("2d");
        for (let e = 0; e < 5; e++) {
          const o = 64 + (e % 2 == 0 ? -14 : 12) * (e < 2 ? 1 : -1),
            a = 64 + (e < 3 ? -10 : 14),
            r = t.createRadialGradient(o, a, 0, 64, 64, 56);
          (r.addColorStop(0, "rgba(255, 255, 255, " + (0.28 - 0.035 * e) + ")"),
            r.addColorStop(0.5, "rgba(255, 255, 255, " + (0.15 - 0.02 * e) + ")"),
            r.addColorStop(1, "rgba(255, 255, 255, 0)"),
            (t.fillStyle = r),
            t.fillRect(0, 0, 128, 128));
        }
        const o = new THREE.CanvasTexture(e);
        return ((o.encoding = THREE.sRGBEncoding), o);
      })(),
      $t = i.profile.counts.plumeColumns,
      Yt = [];
    for (let e = 0; e < $t; e++) {
      const t = 8200 + 31 * e,
        o = Qe(t),
        a = Qe(t + 17),
        r = Qe(t + 33),
        n = Qe(t + 49),
        s = pt + (o - 0.5) * 0.58,
        i = 1.4 + 1.9 * a,
        l = gt(Rt, s),
        h = (Number.isFinite(l) ? l : 14) + 0.45 + 2.6 * r,
        c = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: kt,
            color: 14932427,
            transparent: !0,
            opacity: 0.38 + 0.25 * n,
            depthWrite: !1,
            fog: !1,
          }),
        ),
        d = 1.45 + 2.0 * r;
      (c.scale.set(0.95 * d, 1.2 * d, 1),
        c.position.set(Math.cos(s) * i, h, Math.sin(s) * i),
        xt.add(c),
        Yt.push({
          mesh: c,
          baseY: h,
          phase: o * Math.PI * 2,
          driftSpeed: 0.2 + 0.4 * a,
          riseSpeed: 0.55 + 0.5 * r,
          cycleHeight: 5 + 2.5 * n,
          baseOpacity: 0.38 + 0.25 * n,
          baseScaleX: 0.95 * d,
          baseScaleY: 1.2 * d,
          angle: s,
          radius: i,
          haze: 0,
        }));
    }
    const craterHazeCount = i.profile.counts.craterHaze;
    for (let e = 0; e < craterHazeCount; e += 1) {
      const o = Qe(8701 + 1.91 * e),
        a = Qe(8751 + 2.37 * e),
        r = Qe(8801 + 3.07 * e),
        n = Qe(8851 + 3.77 * e),
        s = pt + (o - 0.5) * 1.05,
        i2 = 1.8 + 2.4 * a,
        l = gt(Rt, s),
        h = (Number.isFinite(l) ? l : 14) + 0.05 + 1.1 * r,
        c = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: kt,
            color: 13089448,
            transparent: !0,
            opacity: 0.22 + 0.14 * n,
            depthWrite: !1,
            fog: !1,
          }),
        ),
        d = 2.8 + 1.6 * r;
      (c.scale.set(1.15 * d, 0.85 * d, 1),
        c.position.set(Math.cos(s) * i2, h, Math.sin(s) * i2),
        xt.add(c),
        Yt.push({
          mesh: c,
          baseY: h,
          phase: o * Math.PI * 2,
          driftSpeed: 0.08 + 0.12 * a,
          riseSpeed: 0.18 + 0.2 * r,
          cycleHeight: 3 + 1.5 * n,
          baseOpacity: 0.22 + 0.14 * n,
          baseScaleX: 1.15 * d,
          baseScaleY: 0.85 * d,
          angle: s,
          radius: i2,
          haze: 1,
        }));
    }
    const plumeSystem = registerDecorativeSystem({
      getCenter(target) {
        return xt.getWorldPosition(target);
      },
      group: xt,
      importance: "nearAtmosphere",
      name: "plumes",
      radius: 24,
    });
    Yt.forEach((e) => {
      if (e.mesh) {
        e.mesh.castShadow = !1;
        e.mesh.receiveShadow = !1;
      }
    });
    const Dt = new THREE.Group();
    ye.add(Dt);
    const Ot = new THREE.MeshStandardMaterial({
        color: 10122585,
        roughness: 0.97,
        metalness: 0.01,
      }),
      qt = i.lowPower ? 16 : 30;
    for (let e = 0; e < qt; e += 1) {
      const t = Qe(1.41 * e + 7.2),
        o = Qe(2.03 * e + 9.4),
        r = Qe(2.89 * e + 13.7),
        n = 0.22 + 0.78 * t,
        s = new THREE.Mesh(new THREE.DodecahedronGeometry(n, 0), Ot),
        l = 12 + 14 * o,
        h = 10 * (r - 0.5),
        c = Math.cos(pt),
        d = Math.sin(pt),
        w = c * l + -d * h,
        p = d * l + c * h;
      (s.position.set(w, a(w, p) + 0.2 * n, p),
        s.rotation.set(
          Qe(4.17 * e + 5.1) * Math.PI,
          Qe(4.89 * e + 1.8) * Math.PI,
          Qe(5.63 * e + 3.6) * Math.PI,
        ),
        (s.castShadow = !i.lowPower),
        (s.receiveShadow = !i.lowPower),
        Dt.add(s));
    }
    const Lt = new THREE.MeshStandardMaterial({ color: 9398605, roughness: 0.96, metalness: 0.01 }),
      Vt = i.lowPower ? 7 : 13;
    for (let e = 0; e < Vt; e += 1) {
      const t = Qe(7.17 * e + 4.8),
        o = Qe(8.41 * e + 2.9),
        r = Qe(9.73 * e + 6.1),
        n = new THREE.Mesh(
          new THREE.BoxGeometry(0.28 + 0.6 * t, 0.14 + 0.35 * o, 0.5 + 0.8 * r),
          Lt,
        ),
        s = pt + 1 * (t - 0.5),
        l = 13 + 12 * o,
        h = Math.cos(s) * l,
        c = Math.sin(s) * l;
      (n.position.set(h, a(h, c) + 0.05, c),
        n.rotation.set(0.35 * (t - 0.5), s + Math.PI * (0.15 + 0.35 * o), 0.5 * (r - 0.5)),
        (n.castShadow = !i.lowPower),
        (n.receiveShadow = !i.lowPower),
        Dt.add(n));
    }
    const Xt = i.lowPower ? 4 : 6,
      Nt = [],
      Ut = new THREE.Group(),
      Zt = new THREE.CylinderGeometry(0.08, 0.15, 2.5, i.lowPower ? 4 : 6),
      jt = new THREE.MeshStandardMaterial({ color: 5913896, roughness: 0.95, metalness: 0.01 });
    function _t(e, t, o, a) {
      const r = document.createElement("canvas");
      ((r.width = 64), (r.height = 96));
      const n = r.getContext("2d"),
        s = n.createRadialGradient(32, 52, 0, 32, 48, 40);
      (s.addColorStop(0, e),
        s.addColorStop(0.25, t),
        s.addColorStop(0.55, o),
        s.addColorStop(1, "rgba(200, 60, 10, 0)"),
        (n.fillStyle = s),
        n.beginPath(),
        n.moveTo(32, 6),
        n.bezierCurveTo(12, 36, 6, 58, 14, 76),
        n.bezierCurveTo(18, 86, 46, 86, 50, 76),
        n.bezierCurveTo(58, 58, 52, 36, 32, 6),
        n.closePath(),
        n.fill());
      const i = n.createRadialGradient(32, 22, 0, 32, 28, 16);
      (i.addColorStop(0, a),
        i.addColorStop(1, "rgba(255, 200, 80, 0)"),
        (n.fillStyle = i),
        n.beginPath(),
        n.ellipse(32, 26, 10, 18, 0, 0, 2 * Math.PI),
        n.fill());
      const baseGrad = n.createRadialGradient(32, 78, 0, 32, 78, 14);
      (baseGrad.addColorStop(0, "rgba(180, 210, 255, 0.5)"),
        baseGrad.addColorStop(0.6, "rgba(150, 190, 255, 0.2)"),
        baseGrad.addColorStop(1, "rgba(120, 170, 255, 0)"),
        (n.fillStyle = baseGrad),
        n.beginPath(),
        n.ellipse(32, 78, 8, 6, 0, 0, 2 * Math.PI),
        n.fill());
      const l = new THREE.CanvasTexture(r);
      return ((l.encoding = THREE.sRGBEncoding), l);
    }
    function makeHotCoreTexture() {
      const e = document.createElement("canvas");
      ((e.width = 32), (e.height = 48));
      const t = e.getContext("2d");
      if (!t) return null;
      const o = t.createRadialGradient(16, 28, 0, 16, 28, 16);
      (o.addColorStop(0, "rgba(255, 255, 255, 1)"),
        o.addColorStop(0.35, "rgba(255, 248, 220, 0.8)"),
        o.addColorStop(0.75, "rgba(255, 220, 160, 0.3)"),
        o.addColorStop(1, "rgba(255, 200, 120, 0)"),
        (t.fillStyle = o),
        t.beginPath(),
        t.ellipse(16, 28, 9, 17, 0, 0, 2 * Math.PI),
        t.fill());
      const a = new THREE.CanvasTexture(e);
      return ((a.encoding = THREE.sRGBEncoding), a);
    }
    function makeEmberTexture() {
      const e = document.createElement("canvas");
      ((e.width = 32), (e.height = 32));
      const t = e.getContext("2d");
      if (!t) return null;
      const o = t.createRadialGradient(16, 16, 0, 16, 16, 14);
      (o.addColorStop(0, "rgba(255, 240, 200, 1)"),
        o.addColorStop(0.4, "rgba(255, 160, 60, 0.7)"),
        o.addColorStop(1, "rgba(200, 60, 10, 0)"),
        (t.fillStyle = o),
        t.beginPath(),
        t.arc(16, 16, 14, 0, 2 * Math.PI),
        t.fill());
      const a = new THREE.CanvasTexture(e);
      return ((a.encoding = THREE.sRGBEncoding), a);
    }
    const Qt = _t(
        "rgba(255, 245, 200, 0.95)",
        "rgba(255, 200, 80, 0.7)",
        "rgba(255, 130, 30, 0.3)",
        "rgba(255, 250, 220, 0.8)",
      ),
      Jt = _t(
        "rgba(255, 180, 60, 0.5)",
        "rgba(255, 120, 20, 0.3)",
        "rgba(200, 60, 10, 0.1)",
        "rgba(255, 200, 100, 0.3)",
      ),
      hotCoreTex = makeHotCoreTexture(),
      emberTex = makeEmberTexture(),
      Kt = pt + 0.616,
      eo = 2 * Math.PI - 1.232;
    for (let e = 0; e < Xt; e += 1) {
      const t = Kt + (e + 0.5) * (eo / Xt),
        o = 13.2 * Math.cos(t),
        r = 13.2 * Math.sin(t),
        n = Math.max(a(o, r), wt),
        s = new THREE.Mesh(Zt, jt);
      (s.position.set(o, n + 2.4, r),
        (s.rotation.x = 0.08 * (Qe(4001 + e) - 0.5)),
        (s.rotation.z = 0.08 * (Qe(4011 + e) - 0.5)),
        Ut.add(s));
      const l = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: Qt,
          transparent: !0,
          opacity: 0.85,
          depthWrite: !1,
          blending: THREE.AdditiveBlending,
        }),
      );
      (l.position.set(o, n + 3.9, r), l.scale.set(0.8, 1.4, 1), Ut.add(l));
      const h = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: Jt,
          transparent: !0,
          opacity: 0.45,
          depthWrite: !1,
          blending: THREE.AdditiveBlending,
        }),
      );
      (h.position.set(o, n + 3.7, r), h.scale.set(1.6, 2.4, 1), Ut.add(h));
      const hot = hotCoreTex
        ? new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: hotCoreTex,
              transparent: !0,
              opacity: 0.9,
              depthWrite: !1,
              blending: THREE.AdditiveBlending,
            }),
          )
        : null;
      hot && (hot.position.set(o, n + 4.05, r), hot.scale.set(0.4, 0.7, 1), Ut.add(hot));
      const gRing = new THREE.Mesh(
        new THREE.RingGeometry(0.3, 2.5, 24),
        new THREE.MeshBasicMaterial({
          color: 16752704,
          transparent: !0,
          opacity: 0.08,
          side: THREE.DoubleSide,
          depthWrite: !1,
          blending: THREE.AdditiveBlending,
        }),
      );
      ((gRing.rotation.x = -Math.PI / 2), gRing.position.set(o, n + 0.05, r), Ut.add(gRing));
      const embers = [];
      if (!i.lowPower && emberTex) {
        const s = 5;
        for (let a = 0; a < s; a += 1) {
          const s = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: emberTex,
              transparent: !0,
              opacity: 0,
              depthWrite: !1,
              blending: THREE.AdditiveBlending,
            }),
          );
          const l = 0.08 + 0.08 * Qe(4101 + e * 7 + a);
          (s.scale.set(l, l, 1),
            s.position.set(o, n + 3.9, r),
            Ut.add(s),
            embers.push({
              mesh: s,
              phase: Qe(4111 + e * 7 + a) * Math.PI * 2,
              speed: 0.9 + 0.5 * Qe(4121 + e * 7 + a),
              driftX: 0.4 * (Qe(4131 + e * 7 + a) - 0.5),
              driftZ: 0.4 * (Qe(4141 + e * 7 + a) - 0.5),
              size: l,
            }));
        }
      }
      const c = {
        flameCore: l,
        flameOuter: h,
        flameHot: hot,
        groundRing: gRing,
        embers: embers,
        baseFlameY: n + 3.9,
        baseX: o,
        baseZ: r,
        baseGroundY: n + 0.05,
        phase: Qe(4021 + e) * Math.PI * 2,
      };
      if (!i.lowPower) {
        const e = Math.atan2(18, 24);
        let a = Math.abs(t - e);
        a > Math.PI && (a = 2 * Math.PI - a);
        const s = a / Math.PI,
          i = 0.3 + 0.9 * s,
          l = 8 + 10 * s,
          h = new THREE.PointLight(16752704, i, l, 2);
        (h.position.set(o, n + 3.8, r), Ut.add(h), (c.light = h), (c.baseIntensity = i));
      }
      Nt.push(c);
    }
    ye.add(Ut);
    const to = i.lowPower ? 14 : 32,
      oo = new THREE.Group();
    const PLANT = plantPalette || {
      leafDeep: "#2c3c18",
      leafMid: "#4a6028",
      leafTip: "#8aa653",
      leafVein: "rgba(30, 40, 18, 0.45)",
      leafHighlight: "rgba(220, 230, 180, 0.3)",
      leafShadow: "rgba(14, 20, 8, 0.35)",
      grassRoot: "#3d5020",
      grassTip: "#8ba85a",
      grassShadow: "rgba(12, 18, 6, 0.35)",
    };
    function ao(e) {
      const t = 128,
        o = document.createElement("canvas");
      ((o.width = t), (o.height = t));
      const a = o.getContext("2d");
      if (!a) return null;
      a.clearRect(0, 0, t, t);
      const cx = 64,
        cy = 64,
        haloGrad = a.createRadialGradient(cx, cy, 0, cx, cy, 58);
      (haloGrad.addColorStop(0, "rgba(30, 42, 18, 0.22)"),
        haloGrad.addColorStop(0.6, "rgba(30, 42, 18, 0.06)"),
        haloGrad.addColorStop(1, "rgba(30, 42, 18, 0)"),
        (a.fillStyle = haloGrad),
        a.beginPath(),
        a.arc(cx, cy, 58, 0, 2 * Math.PI),
        a.fill());
      const leafCount = 5 + Math.floor(4 * Qe(e));
      for (let o = 0; o < leafCount; o += 1) {
        const r = Qe(e + 3.1 * o) * Math.PI * 2,
          n = t * (0.32 + 0.18 * Qe(e + 1.7 * o)),
          s = n * (0.32 + 0.18 * Qe(e + 4.2 * o)),
          i = cx + Math.cos(r) * t * 0.1,
          l = cy + Math.sin(r) * t * 0.1,
          h = Qe(e + 5.1 * o) * Math.PI,
          tone = Qe(e + 6.3 * o),
          deep = PLANT.leafDeep,
          mid = PLANT.leafMid,
          tip = PLANT.leafTip,
          leafGrad = a.createRadialGradient(i, l, 0, i, l, n);
        (leafGrad.addColorStop(0, tone > 0.7 ? tip : mid),
          leafGrad.addColorStop(0.55, mid),
          leafGrad.addColorStop(0.85, deep),
          leafGrad.addColorStop(1, "rgba(20, 28, 10, 0)"),
          (a.fillStyle = leafGrad),
          a.beginPath(),
          a.ellipse(i, l, n, s, h, 0, 2 * Math.PI),
          a.fill(),
          a.save(),
          a.translate(i, l),
          a.rotate(h),
          (a.strokeStyle = PLANT.leafVein),
          (a.lineWidth = 0.8),
          a.beginPath(),
          a.moveTo(-n * 0.9, 0),
          a.lineTo(n * 0.9, 0),
          a.stroke(),
          (a.lineWidth = 0.5),
          a.beginPath(),
          a.moveTo(-n * 0.3, -s * 0.4),
          a.lineTo(n * 0.1, s * 0.15),
          a.stroke(),
          a.beginPath(),
          a.moveTo(n * 0.3, -s * 0.4),
          a.lineTo(-n * 0.1, s * 0.15),
          a.stroke(),
          a.restore());
        const hi = a.createRadialGradient(
          i - n * 0.3,
          l - s * 0.4,
          0,
          i - n * 0.3,
          l - s * 0.4,
          n * 0.5,
        );
        (hi.addColorStop(0, PLANT.leafHighlight),
          hi.addColorStop(1, "rgba(220, 230, 180, 0)"),
          (a.fillStyle = hi),
          a.beginPath(),
          a.ellipse(i - n * 0.3, l - s * 0.4, n * 0.5, s * 0.3, h, 0, 2 * Math.PI),
          a.fill());
      }
      const n = new THREE.CanvasTexture(o);
      return ((n.encoding = THREE.sRGBEncoding), n);
    }
    function ro(e) {
      const t = document.createElement("canvas");
      ((t.width = 256), (t.height = 64));
      const o = t.getContext("2d");
      if (!o) return null;
      o.clearRect(0, 0, 256, 64);
      const shadowGrad = o.createLinearGradient(0, 48, 0, 64);
      (shadowGrad.addColorStop(0, "rgba(12, 18, 6, 0)"),
        shadowGrad.addColorStop(1, PLANT.grassShadow),
        (o.fillStyle = shadowGrad),
        o.fillRect(0, 48, 256, 16));
      const bladeCount = 9 + Math.floor(5 * Qe(e + 0.3));
      for (let a = 0; a < bladeCount; a += 1) {
        const r = 12 + 232 * Qe(e + 2.1 * a),
          n = 56 + 4 * (Qe(e + 2.9 * a) - 0.5),
          s = 22 + 28 * Qe(e + 3.7 * a),
          i = n - s,
          l = r + 8 * (Qe(e + 4.3 * a) - 0.5),
          h = 3 + 2.5 * Qe(e + 5.9 * a),
          grad = o.createLinearGradient(r, n, l, i);
        (grad.addColorStop(0, PLANT.grassRoot),
          grad.addColorStop(1, PLANT.grassTip),
          (o.fillStyle = grad),
          o.beginPath(),
          o.moveTo(r - h / 2, n),
          o.quadraticCurveTo((r + l) / 2 - h / 3, (n + i) / 2, l, i),
          o.quadraticCurveTo((r + l) / 2 + h / 3, (n + i) / 2, r + h / 2, n),
          o.closePath(),
          o.fill(),
          (o.strokeStyle = "rgba(14, 22, 8, 0.35)"),
          (o.lineWidth = 0.6),
          o.beginPath(),
          o.moveTo(r, n),
          o.quadraticCurveTo((r + l) / 2, (n + i) / 2, l, i),
          o.stroke());
      }
      const a = new THREE.CanvasTexture(t);
      return ((a.encoding = THREE.sRGBEncoding), a);
    }
    const no = function (e, t) {
      return new THREE.MeshStandardMaterial({
        color: 16777215,
        map: e,
        transparent: !0,
        opacity: t,
        alphaTest: 0.25,
        roughness: 0.85,
        metalness: 0,
        depthWrite: !1,
        side: THREE.DoubleSide,
      });
    };
    const plantShadowMaterial = new THREE.MeshBasicMaterial({
      color: 0,
      transparent: !0,
      opacity: 0.18,
      depthWrite: !1,
    });
    function makePlantShadowTexture() {
      const e = document.createElement("canvas");
      ((e.width = 64), (e.height = 64));
      const t = e.getContext("2d");
      if (!t) return null;
      const o = t.createRadialGradient(32, 32, 0, 32, 32, 30);
      (o.addColorStop(0, "rgba(0, 0, 0, 0.55)"),
        o.addColorStop(0.6, "rgba(0, 0, 0, 0.18)"),
        o.addColorStop(1, "rgba(0, 0, 0, 0)"),
        (t.fillStyle = o),
        t.fillRect(0, 0, 64, 64));
      const a = new THREE.CanvasTexture(e);
      return ((a.encoding = THREE.sRGBEncoding), a);
    }
    const plantShadowTex = makePlantShadowTexture();
    plantShadowTex && (plantShadowMaterial.map = plantShadowTex);
    const plantShadowGroup = new THREE.Group();
    ye.add(plantShadowGroup);
    const plantShadowRecords = [];
    function addPlantShadow(e, t, o, a, r) {
      if (!plantShadowTex) return;
      const n = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), plantShadowMaterial);
      ((n.rotation.x = -Math.PI / 2),
        n.position.set(e, t - 0.01, o),
        n.scale.set(1.2 * a, 1.2 * r, 1),
        plantShadowGroup.add(n),
        plantShadowRecords.push(n));
    }
    for (let e = 0; e < to; e += 1) {
      const t = Qe(6001 + 3.7 * e) * Math.PI * 2,
        o = 25 + 65 * Qe(6002 + 2.9 * e),
        r = Math.cos(t) * o,
        n = Math.sin(t) * o,
        s = a(r, n) + 0.02,
        l = 1.5 + 4 * Qe(6003 + 4.1 * e),
        h = l * (0.65 + 0.7 * Qe(6004 + 1.3 * e)),
        c = l * (0.65 + 0.7 * Qe(6005 + 2.1 * e)),
        d = ao(8e3 + 11 * e),
        w = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), no(d, 0.5 + 0.3 * Qe(6006 + 1.7 * e)));
      (addPlantShadow(r, s, n, h, c),
        (w.rotation.x = -Math.PI / 2),
        (w.rotation.z = Qe(6007 + 3.3 * e) * Math.PI * 2),
        w.position.set(r, s, n),
        w.scale.set(h, c, 1),
        (w.receiveShadow = !i.lowPower),
        oo.add(w));
    }
    {
      const e = Qe(6200) * Math.PI * 2,
        t = 78 + 15 * Qe(6201),
        o = Math.cos(e) * t,
        r = Math.sin(e) * t,
        n = a(o, r) + 0.02,
        s = ao(8500),
        l = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), no(s, 0.6));
      (addPlantShadow(o, n, r, 16, 12),
        (l.rotation.x = -Math.PI / 2),
        (l.rotation.z = Qe(6202) * Math.PI * 2),
        l.position.set(o, n, r),
        l.scale.set(16, 12, 1),
        (l.receiveShadow = !i.lowPower),
        oo.add(l));
    }
    const so = i.lowPower ? 3 : 7;
    for (let e = 0; e < so; e += 1) {
      const t = Qe(6300 + 4.3 * e) * Math.PI * 2,
        o = 22 + 70 * Qe(6301 + 3.1 * e),
        r = Math.cos(t) * o,
        n = Math.sin(t) * o,
        s = a(r, n) + 0.02,
        l = ro(9e3 + 13 * e),
        h = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), no(l, 0.45 + 0.25 * Qe(6302 + 2.7 * e)));
      ((h.rotation.x = -Math.PI / 2),
        (h.rotation.z = Qe(6303 + 5.1 * e) * Math.PI * 2),
        h.position.set(r, s, n));
      const c = 8 + 14 * Qe(6304 + 1.9 * e),
        d = 1.5 + 2.5 * Qe(6305 + 2.3 * e);
      (addPlantShadow(r, s, n, c, d),
        h.scale.set(c, d, 1),
        (h.receiveShadow = !i.lowPower),
        oo.add(h));
    }
    ye.add(oo);
    const io = [];
    oo.children.forEach((e) => {
      io.push({ x: e.position.x, z: e.position.z, r: 0.5 * Math.max(e.scale.x, e.scale.y) });
    });
    for (let e = 0; e < xe.count; e += 1) {
      const t = xe.getX(e),
        o = xe.getY(e),
        a = xe.getZ(e);
      let r = 0;
      (io.forEach((e) => {
        const a = t - e.x,
          n = o - e.z,
          s = Math.sqrt(a * a + n * n);
        if (s < e.r) {
          const t = 1 - s / e.r,
            o = t * t * 0.35;
          o > r && (r = o);
        }
      }),
        r > 0 && xe.setZ(e, a - r));
    }
    if (
      ((xe.needsUpdate = !0),
      ve.computeVertexNormals(),
      oo.children.forEach((e) => {
        e.position.y = a(e.position.x, e.position.z) - 0.12;
      }),
      plantShadowRecords.forEach((e) => {
        e.position.y = a(e.position.x, e.position.z) - 0.1;
      }),
      !i.lowPower)
    ) {
      const e = new THREE.WebGLCubeRenderTarget(128, {
          format: THREE.RGBFormat,
          generateMipmaps: !0,
          minFilter: THREE.LinearMipmapLinearFilter,
        }),
        t = new THREE.CubeCamera(0.5, 200, e);
      (t.position.set(0, a(0, 0) + 0.5, 0), T.add(t));
      let o = !1;
      const r = () => {
        o ||
          ((o = !0),
          (oo.visible = !1),
          t.update(b, T),
          (oo.visible = !0),
          oo.children.forEach((t) => {
            ((t.material.envMap = e.texture),
              (t.material.envMapIntensity = 0.88),
              (t.material.needsUpdate = !0));
          }));
      };
      requestAnimationFrame(() => requestAnimationFrame(r));
    }
    const lo = new THREE.Mesh(
      new THREE.RingGeometry(11.6, 18, 80),
      new THREE.MeshBasicMaterial({
        color: 16240538,
        transparent: !0,
        opacity: 0.08,
        side: THREE.DoubleSide,
      }),
    );
    ((lo.rotation.x = -Math.PI / 2), (lo.position.y = wt + 0.9), _e.add(lo));
    const ho = [];
    function co(e) {
      const t = 3.4 + 1.4 * Qe(e + 0.17),
        o = 0.34 + 0.15 * Qe(e + 0.41),
        a = 1.75 + 0.72 * Qe(e + 0.63);
      return new THREE.BoxGeometry(t, o, a);
    }
    [10, 18, 26].forEach((e, t) => {
      const o = new THREE.Mesh(
        new THREE.TorusGeometry(14.6 - 1.25 * t, 0.1, 14, 80),
        new THREE.MeshBasicMaterial({
          color: 1 === t ? 15914942 : 15250813,
          transparent: !0,
          opacity: 0.16 - 0.03 * t,
        }),
      );
      ((o.position.y = wt + e), (o.rotation.x = Math.PI / 2), _e.add(o), ho.push(o));
    });
    const wo = (function () {
        const e = document.createElement("canvas");
        ((e.width = i.lowPower ? 256 : 512), (e.height = i.lowPower ? 64 : 128));
        const t = e.getContext("2d");
        if (!t) return null;
        ((t.fillStyle = "#5e4130"), t.fillRect(0, 0, e.width, e.height));
        for (let o = 0; o < 12; o += 1) {
          const a = Qe(50 + 4.7 * o) * e.width,
            r = Qe(60 + 3.2 * o) * e.height,
            n = e.width * (0.15 + 0.25 * Qe(70 + 2.1 * o)),
            s = e.height * (0.3 + 0.5 * Qe(80 + 1.6 * o)),
            i = Qe(90 + 2.9 * o) > 0.5;
          ((t.fillStyle = i
            ? `rgba(170, 128, 86, ${0.1 + 0.1 * Qe(95 + o)})`
            : `rgba(18, 10, 4, ${0.12 + 0.12 * Qe(96 + o)})`),
            t.beginPath(),
            t.ellipse(a, r, n, s, 0, 0, 2 * Math.PI),
            t.fill());
        }
        const o = i.lowPower ? 160 : 320;
        for (let a = 0; a < o; a += 1) {
          const o = Qe(100 + 3.1 * a) * e.height,
            r = 1 + Math.floor(2 * Qe(240 + 1.9 * a)),
            n = Math.floor(46 + 42 * Qe(370 + 0.7 * a)),
            s = 0.22 + 0.28 * Qe(510 + 2.3 * a);
          ((t.fillStyle = `rgba(${n}, ${Math.max(30, n - 22)}, ${Math.max(18, n - 30)}, ${s})`),
            t.fillRect(0, o, e.width, r));
        }
        if (!i.lowPower)
          for (let o = 0; o < 120; o += 1) {
            const a = Qe(2100 + 2.7 * o) * e.height,
              r = Math.floor(56 + 44 * Qe(2200 + 1.4 * o));
            ((t.fillStyle = `rgba(${r}, ${Math.max(28, r - 18)}, ${Math.max(16, r - 26)}, ${0.1 + 0.14 * Qe(2300 + o)})`),
              t.fillRect(0, a, e.width, 1));
          }
        const a = i.lowPower ? 14 : 28;
        for (let o = 0; o < a; o += 1) {
          const a = Qe(700 + 5.3 * o) * e.width,
            r = Qe(880 + 4.1 * o) * e.height,
            n = 6 + 14 * Qe(940 + 2.8 * o),
            s = 2 + 6 * Qe(1020 + 3.4 * o),
            i = 0.12 + 0.22 * Qe(1090 + 1.7 * o);
          ((t.strokeStyle = `rgba(58, 35, 24, ${i})`),
            (t.lineWidth = 1),
            t.beginPath(),
            t.ellipse(a, r, n, s, Qe(1170 + 2.1 * o) * Math.PI, 0, 2 * Math.PI),
            t.stroke(),
            n > 12 &&
              ((t.fillStyle = `rgba(42, 26, 16, ${0.5 * i})`),
              t.beginPath(),
              t.ellipse(a, r, 0.4 * n, 0.4 * s, Qe(1175 + o) * Math.PI, 0, 2 * Math.PI),
              t.fill()));
        }
        if (!i.lowPower) {
          t.lineWidth = 0.8;
          for (let o = 0; o < 30; o += 1) {
            const a = Qe(1300 + 3.7 * o) * e.width,
              r = Qe(1340 + 2.9 * o) * e.height,
              n = 4 + 16 * Qe(1380 + 1.3 * o),
              s = 4 * (Qe(1420 + 4.1 * o) - 0.5);
            ((t.strokeStyle = `rgba(42, 28, 18, ${0.12 + 0.12 * Qe(1425 + o)})`),
              t.beginPath(),
              t.moveTo(a, r),
              t.quadraticCurveTo(a + s, r + 0.5 * n, a + 0.6 * s, r + n),
              t.stroke());
          }
          for (let o = 0; o < 8; o += 1) {
            const a = Qe(1700 + 3.3 * o) * e.width * 0.6,
              r = Qe(1720 + 2.7 * o) * e.height,
              n = e.width * (0.08 + 0.2 * Qe(1740 + 1.9 * o));
            ((t.strokeStyle = `rgba(36, 22, 14, ${0.08 + 0.1 * Qe(1760 + o)})`),
              (t.lineWidth = 0.6),
              t.beginPath(),
              t.moveTo(a, r),
              t.lineTo(a + n, r + 2 * (Qe(1780 + o) - 0.5)),
              t.stroke());
          }
        }
        if (!i.lowPower)
          for (let o = 0; o < 200; o += 1) {
            const a = Qe(1500 + 2.3 * o) * e.width,
              r = Qe(1540 + 3.1 * o) * e.height,
              n = 0.5 + 1.8 * Qe(1580 + 1.7 * o),
              s = Math.floor(24 + 28 * Qe(1620 + 2.7 * o));
            ((t.fillStyle = `rgba(${s}, ${Math.max(12, s - 14)}, ${Math.max(8, s - 18)}, ${0.08 + 0.14 * Qe(1660 + 1.1 * o)})`),
              t.beginPath(),
              t.arc(a, r, n, 0, 2 * Math.PI),
              t.fill());
          }
        if (!i.lowPower)
          for (let o = 0; o < 6; o += 1) {
            const a = Qe(3100 + 4.1 * o) * e.width,
              r = Qe(3120 + 3.3 * o) * e.height,
              n = 8 + 18 * Qe(3140 + 2.5 * o),
              s = t.createRadialGradient(a, r, 0, a, r, n);
            (s.addColorStop(0, `rgba(22, 14, 8, ${0.06 + 0.06 * Qe(3160 + o)})`),
              s.addColorStop(0.6, `rgba(30, 20, 12, ${0.03 + 0.03 * Qe(3170 + o)})`),
              s.addColorStop(1, "rgba(30, 20, 12, 0)"),
              (t.fillStyle = s),
              t.fillRect(a - n, r - n, 2 * n, 2 * n));
          }
        const r = t.createLinearGradient(0, 0, 0, 0.15 * e.height);
        (r.addColorStop(0, "rgba(14, 8, 4, 0.38)"),
          r.addColorStop(1, "rgba(14, 8, 4, 0)"),
          (t.fillStyle = r),
          t.fillRect(0, 0, e.width, 0.18 * e.height));
        const n = t.createLinearGradient(0, 0.82 * e.height, 0, e.height);
        (n.addColorStop(0, "rgba(14, 8, 4, 0)"),
          n.addColorStop(1, "rgba(14, 8, 4, 0.38)"),
          (t.fillStyle = n),
          t.fillRect(0, 0.85 * e.height, e.width, 0.15 * e.height));
        const s = new THREE.CanvasTexture(e);
        return (
          (s.wrapS = THREE.RepeatWrapping),
          (s.wrapT = THREE.RepeatWrapping),
          s.repeat.set(2.4, 1.2),
          (s.anisotropy = P(2, 6)),
          (s.encoding = THREE.sRGBEncoding),
          s
        );
      })(),
      po = [10126450, 8287592, 9138784, 10518632, 7365208, 9728094, 8945266, 10390128].map(
        (e) =>
          new THREE.MeshStandardMaterial({
            color: e,
            map: wo,
            roughness: 0.88 + 0.1 * Math.random(),
            metalness: 0.01,
          }),
      ),
      Mo = [],
      Eo = i.lowPower ? 4 : 7;
    for (let e = 0; e < Eo; e += 1) Mo.push(co(31 + 19.3 * e));
    function mo(e) {
      const t = bt.position.y - 17,
        o = bt.position.y + 17;
      return 12.2 + (8.8 - 12.2) * Math.min(1, Math.max(0, (e - t) / (o - t)));
    }
    for (let e = 0; e < E; e += 1) {
      const t = Qe(1.73 * e + 4.7),
        o = Qe(2.41 * e + 1.9),
        a = Qe(3.97 * e + 8.2),
        r = Qe(5.21 * e + 2.6),
        n = Qe(6.13 * e + 0.8),
        s = 0.19 * e + 0.022 * (t - 0.5),
        l = e > 0.5 * E;
      if (r > 1 - (l ? 0.12 : 0.05)) continue;
      const h = Mo[Math.floor(r * Mo.length)],
        c = po[Math.floor(Qe(7.31 * e + 3.2) * po.length)],
        d = new THREE.Mesh(h, c),
        w = 0.84 + 0.14 * t,
        p = l && n > 0.72,
        M = p ? w * (0.58 + 0.22 * o) : w,
        m = 0.9 + 0.22 * o,
        u = 0.9 + 0.2 * a,
        g = wt + 1.2 + 0.34 * e + 0.05 * (r - 0.5),
        f = (h.parameters && h.parameters.width ? h.parameters.width : 5.6) * M * 0.5,
        T = p ? 0.42 + 0.2 * a : 0.3 + 0.14 * a,
        R = mo(g) + f - T + 0.14 * (o - 0.5);
      (d.scale.set(M, m, u),
        d.position.set(Math.cos(s) * R, g, Math.sin(s) * R),
        (d.rotation.y = 0.05 * (o - 0.5) - s),
        (d.rotation.z = (a - 0.5) * (p ? 0.16 : 0.08)),
        (d.rotation.x = (n - 0.5) * (p ? 0.08 : 0.04)),
        (d.castShadow = !i.lowPower),
        (d.receiveShadow = !i.lowPower),
        _e.add(d));
    }
    const uo = new THREE.BoxGeometry(1.15, 1, 1.15),
      go = new THREE.MeshStandardMaterial({ color: 11833972, roughness: 0.95 }),
      fo = [];
    for (let e = 0; e < m; e += 1) {
      const t = (e / m) * Math.PI * 2,
        o = 25 + (e % 2) * 3.5,
        r = Math.cos(t) * o,
        n = Math.sin(t) * o,
        s = 4 + (e % 3) * 1.4,
        l = a(r, n) + 0.5 * s,
        h = new THREE.Mesh(uo, go);
      ((h.scale.y = s),
        h.position.set(r, l, n),
        (h.castShadow = !i.lowPower),
        (h.receiveShadow = !i.lowPower),
        ye.add(h));
      const c = new THREE.Mesh(
        new THREE.OctahedronGeometry(e % 2 ? 0.6 : 0.5, 0),
        new THREE.MeshStandardMaterial({
          color: e % 3 == 0 ? 14075049 : e % 3 == 1 ? 13228002 : 15316611,
          roughness: 0.4,
          metalness: 0.08,
          emissive: e % 3 == 0 ? 5916214 : e % 3 == 1 ? 5202536 : 8345145,
          emissiveIntensity: 0.14,
        }),
      );
      (c.position.set(r, a(r, n) + s + 0.9, n),
        (c.castShadow = !i.lowPower),
        ye.add(c),
        fo.push(c));
    }
    const To = new THREE.Group();
    ye.add(To);
    const Ro = new THREE.BoxGeometry(0.65, 2.6, 0.65),
      bo = new THREE.MeshStandardMaterial({
        color: 14074533,
        roughness: 0.5,
        metalness: 0.05,
        emissive: 5916214,
        emissiveIntensity: 0.08,
      });
    [
      { x: 13, z: 19, color: 14074533 },
      { x: -17, z: 11, color: 13228002 },
      { x: 18, z: -13, color: 15316611 },
      { x: -12, z: -18, color: 16113077 },
    ].forEach((e) => {
      const t = new THREE.Mesh(Ro, bo.clone());
      (t.material.color.setHex(e.color),
        t.material.emissive.setHex(e.color),
        (t.material.emissiveIntensity = 0.08),
        t.position.set(e.x, a(e.x, e.z) + 1.4, e.z),
        (t.rotation.z = 0.28),
        (t.castShadow = !i.lowPower),
        To.add(t));
    });
    // Camera-following cloud layers stay centered on the orbiting view.
    const cloudAnchor = new THREE.Group();
    cloudAnchor.position.y = -7.5;
    T.add(cloudAnchor);
    const driftCloudGroup = new THREE.Group();
    cloudAnchor.add(driftCloudGroup);
    cloudGroups.push(driftCloudGroup);
    setCloudGroupSceneVisibility(driftCloudGroup, true);
    const driftClouds = [],
      driftCloudTexture = (function () {
        const e = document.createElement("canvas");
        ((e.width = 96), (e.height = 96));
        const t = e.getContext("2d");
        if (!t) return null;
        const o = 0.5 * e.width,
          a = 0.5 * e.height,
          r = t.createRadialGradient(o, a, 0.08 * e.width, o, a, 0.5 * e.width);
        (r.addColorStop(0, "rgba(248, 228, 201, 0.9)"),
          r.addColorStop(0.42, "rgba(206, 177, 146, 0.46)"),
          r.addColorStop(1, "rgba(118, 95, 72, 0)"),
          (t.fillStyle = r),
          t.beginPath(),
          t.arc(o, a, 0.48 * e.width, 0, 2 * Math.PI),
          t.fill());
        for (let o = 0; o < 18; o += 1) {
          const a = (0.5 * Math.sin(19.41 * o) + 0.5) * e.width,
            r = (0.5 * Math.sin(7.31 * o + 2.1) + 0.5) * e.height,
            n = 2 + 5 * (0.5 * Math.sin(11.7 * o) + 0.5);
          ((t.fillStyle = `rgba(255, 244, 220, ${0.025 + 0.04 * (0.5 * Math.sin(5.19 * o) + 0.5)})`),
            t.beginPath(),
            t.arc(a, r, n, 0, 2 * Math.PI),
            t.fill());
        }
        const n = new THREE.CanvasTexture(e);
        return ((n.encoding = THREE.sRGBEncoding), (n.anisotropy = P(1, 2)), n);
      })(),
      driftCloudCount = i.profile.counts.driftClouds;
    for (let e = 0; e < driftCloudCount; e += 1) {
      const t = Qe(401 + 2.13 * e),
        o = Qe(503 + 1.73 * e),
        a = Qe(617 + 2.91 * e),
        r = Qe(709 + 3.37 * e),
        n = pt + 0.82 * (t - 0.5),
        s = 9.2 + 2.7 * o,
        l = wt + 20.8 + 13.8 * a,
        h = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: driftCloudTexture,
            color: 14204571,
            transparent: !0,
            opacity: i.lowPower ? 0.11 : 0.14,
            depthWrite: !1,
          }),
        );
      h.position.set(Math.cos(n) * s, l, Math.sin(n) * s);
      const c = (i.lowPower ? 1.8 : 2.2) + r * (i.lowPower ? 1.6 : 2.4);
      (h.scale.set(c, c * (0.68 + 0.42 * o), 1),
        driftCloudGroup.add(h),
        driftClouds.push({
          mesh: h,
          yaw: n,
          radius: s,
          baseY: l,
          drift: 0.65 * (r - 0.5),
          phase: t * Math.PI * 2,
          speed: 0.32 + 0.74 * a,
          ampY: 0.18 + 0.52 * o,
        }));
    }
    const driftCloudSystem = registerDecorativeSystem({
      getCenter(target) {
        return driftCloudGroup.getWorldPosition(target);
      },
      group: driftCloudGroup,
      importance: "backsideDecor",
      isCloudGroup: true,
      name: "driftClouds",
      radius: 46,
    });
    setShadowParticipation(driftCloudGroup);
    const vo = new THREE.BufferGeometry(),
      xo = new Float32Array(3 * u),
      Co = new Float32Array(3 * u);
    for (let e = 0; e < u; e += 1) {
      const t = 18 + 44 * Math.random(),
        o = Math.random() * Math.PI * 2,
        a = Math.cos(o) * t,
        r = Math.sin(o) * t,
        n = 5 + 26 * Math.random();
      ((xo[3 * e] = a), (xo[3 * e + 1] = n), (xo[3 * e + 2] = r));
      const s = [15316611, 16113077, 14075049, 11714754][e % 4],
        i = new THREE.Color(s);
      ((Co[3 * e] = i.r), (Co[3 * e + 1] = i.g), (Co[3 * e + 2] = i.b));
    }
    (vo.setAttribute("position", new THREE.BufferAttribute(xo, 3)),
      vo.setAttribute("color", new THREE.BufferAttribute(Co, 3)));
    const Io = new THREE.Points(
      vo,
      new THREE.PointsMaterial({
        size: i.lowPower ? 0.42 : 0.34,
        vertexColors: !0,
        transparent: !0,
        opacity: 0.68,
        depthWrite: !1,
        sizeAttenuation: !0,
      }),
    );
    ye.add(Io);
    const emberCloudGroup = new THREE.Group();
    (cloudAnchor.add(emberCloudGroup), cloudGroups.push(emberCloudGroup));
    setCloudGroupSceneVisibility(emberCloudGroup, true);
    const emberClouds = [],
      emberCloudTexture = (function () {
        const e = document.createElement("canvas");
        ((e.width = 64), (e.height = 64));
        const t = e.getContext("2d");
        if (!t) return null;
        const o = 0.5 * e.width,
          a = 0.58 * e.height,
          r = t.createRadialGradient(o, a - 4, 2, o, a, 0.38 * e.width);
        (r.addColorStop(0, "rgba(255, 236, 188, 0.92)"),
          r.addColorStop(0.5, "rgba(240, 172, 102, 0.54)"),
          r.addColorStop(1, "rgba(180, 98, 42, 0)"),
          (t.fillStyle = r),
          t.beginPath(),
          t.ellipse(o, a, 0.24 * e.width, 0.29 * e.height, 0, 0, 2 * Math.PI),
          t.fill(),
          (t.fillStyle = "rgba(255, 218, 164, 0.34)"),
          t.beginPath(),
          t.moveTo(o, a - 0.36 * e.height),
          t.lineTo(o - 0.08 * e.width, a - 0.06 * e.height),
          t.lineTo(o + 0.08 * e.width, a - 0.06 * e.height),
          t.closePath(),
          t.fill());
        const n = new THREE.CanvasTexture(e);
        return ((n.encoding = THREE.sRGBEncoding), (n.anisotropy = P(1, 2)), n);
      })(),
      emberCloudCount = i.profile.counts.emberClouds;
    if (emberCloudTexture)
      for (let e = 0; e < emberCloudCount; e += 1) {
        const t = Qe(1201 + 1.37 * e),
          o = Qe(1231 + 2.21 * e),
          r = Qe(1277 + 2.87 * e),
          n = Qe(1301 + 3.43 * e),
          s = t * Math.PI * 2,
          l = 9 + 22 * o,
          h = Math.cos(s) * l,
          c = Math.sin(s) * l,
          d = a(h, c) + 2.6 + 11.5 * r,
          w = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: emberCloudTexture,
              color: 15250813,
              transparent: !0,
              opacity: i.lowPower ? 0.13 : 0.16,
              depthWrite: !1,
            }),
          ),
          p = (i.lowPower ? 0.36 : 0.42) + n * (i.lowPower ? 0.42 : 0.6);
        (w.position.set(h, d, c),
          w.scale.set(0.75 * p, 1.45 * p, 1),
          emberCloudGroup.add(w),
          emberClouds.push({
            mesh: w,
            yaw: s,
            radius: l,
            baseY: d,
            drift: 0.22 * (n - 0.5),
            phase: t * Math.PI * 2,
            speed: 0.9 + 1.3 * r,
          ampY: 0.12 + 0.3 * o,
        }));
      }
    const emberCloudSystem = registerDecorativeSystem({
      getCenter(target) {
        return emberCloudGroup.getWorldPosition(target);
      },
      group: emberCloudGroup,
      importance: "backsideDecor",
      isCloudGroup: true,
      name: "emberClouds",
      radius: 34,
    });
    setShadowParticipation(emberCloudGroup);
    const hazeClouds = [],
      hazeCloudCount = i.profile.counts.hazeClouds,
      hazeCloudGroup = new THREE.Group(),
      hazeCloudCanvas = document.createElement("canvas");
    ((hazeCloudCanvas.width = 128), (hazeCloudCanvas.height = 128));
    const hazeCloudCtx = hazeCloudCanvas.getContext("2d");
    if (hazeCloudCtx)
      for (let e = 0; e < 4; e += 1) {
        const t = 64 + (e % 2 == 0 ? -12 : 10) * (e < 2 ? 1 : -1),
          o = 64 + (e < 2 ? -8 : 12),
          a = hazeCloudCtx.createRadialGradient(t, o, 0, 64, 64, 60);
        (a.addColorStop(0, `rgba(255, 255, 255, ${0.18 - 0.03 * e})`),
          a.addColorStop(0.5, `rgba(220, 210, 200, ${0.08 - 0.01 * e})`),
          a.addColorStop(1, "rgba(200, 190, 180, 0)"),
          (hazeCloudCtx.fillStyle = a),
          hazeCloudCtx.fillRect(0, 0, 128, 128));
      }
    const hazeCloudTexture = new THREE.CanvasTexture(hazeCloudCanvas);
    hazeCloudTexture.encoding = THREE.sRGBEncoding;
    for (let e = 0; e < hazeCloudCount; e += 1) {
      const t = Qe(4101 + 1.47 * e),
        o = Qe(4133 + 2.13 * e),
        a = Qe(4167 + 1.89 * e),
        r = Qe(4199 + 2.51 * e),
        n = t * Math.PI * 2,
        s = 13 + 4 * o,
        l = wt + 0.5 + 6 * a,
        h = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: hazeCloudTexture,
            color: 12232850,
            transparent: !0,
            opacity: i.lowPower ? 0.03 : 0.05,
            depthWrite: !1,
          }),
        ),
        c = 4 + 4 * r;
      (h.scale.set(c, 0.7 * c, 1),
        h.position.set(Math.cos(n) * s, l, Math.sin(n) * s),
        hazeCloudGroup.add(h),
        hazeClouds.push({
          mesh: h,
          yaw: n,
          radius: s,
          baseY: l,
          phase: t * Math.PI * 2,
          speed: 0.3 + 0.5 * o,
          cycleHeight: 6 + 3 * a,
        }));
    }
    (cloudAnchor.add(hazeCloudGroup), cloudGroups.push(hazeCloudGroup));
    setCloudGroupSceneVisibility(hazeCloudGroup, true);
    const hazeCloudSystem = registerDecorativeSystem({
      getCenter(target) {
        return hazeCloudGroup.getWorldPosition(target);
      },
      group: hazeCloudGroup,
      importance: "backsideDecor",
      isCloudGroup: true,
      name: "hazeClouds",
      radius: 30,
    });
    setShadowParticipation(hazeCloudGroup);
    // Pulsing far-cloud billows fade in and out around the skyline anchor.
    const pulseCloudCount = i.profile.counts.pulseClouds,
      pulseClouds = [],
      pulseCloudGroup = new THREE.Group();
    pulseCloudGroup.renderOrder = 10;
    const pulseCloudTexture = driftCloudTexture || emberCloudTexture;
    if (pulseCloudTexture) {
      const pulsePuffsPerCluster = i.profile.counts.pulsePuffsPerCluster,
        treeAlignedAngle = Math.atan2(28, -42),
        treeAlignedDistance = Math.sqrt(2548);
      for (let e = 0; e < pulseCloudCount; e += 1) {
        const isTree = e === 0,
          baseAngle = isTree ? treeAlignedAngle : Qe(5001 + e) * Math.PI * 2,
          baseDist = isTree ? treeAlignedDistance : 32 + 62 * Qe(5006 + e),
          puffs = [];
        for (let p = 0; p < pulsePuffsPerCluster; p += 1) {
          const seed = 200 * e + 17 * p,
            aOff = (Qe(6101 + seed) - 0.5) * 0.26,
            rOff = (Qe(6117 + seed) - 0.5) * 9,
            hOff = (Qe(6133 + seed) - 0.5) * 7,
            sW = 11 + 9 * Qe(6149 + seed),
            sH = sW * (0.5 + 0.22 * Qe(6165 + seed)),
            sprite = new THREE.Sprite(
              new THREE.SpriteMaterial({
                map: pulseCloudTexture,
                color: 16119008,
                transparent: !0,
                opacity: 0,
                depthWrite: !1,
                fog: !1,
              }),
            );
          (sprite.scale.set(sW, sH, 1), pulseCloudGroup.add(sprite));
          puffs.push({ sprite: sprite, aOff: aOff, rOff: rOff, hOff: hOff });
        }
        pulseClouds.push({
          puffs: puffs,
          baseAngle: baseAngle,
          baseDist: baseDist,
          angleDriftAmp: isTree ? 0.12 : 0.6,
          distDriftAmp: isTree ? 3 : 8,
          cycleOffset: e * (10 / pulseCloudCount),
          fadeInDuration: 2,
          holdDuration: isTree ? 8.5 : 2.5,
          fadeOutDuration: 2,
          cyclePeriod: isTree ? 14.5 : 14 + 10 * Qe(5031 + e),
          baseY: 50,
        });
      }
    }
    (cloudAnchor.add(pulseCloudGroup),
      cloudGroups.push(pulseCloudGroup),
      setCloudGroupSceneVisibility(pulseCloudGroup, true),
      applyCloudVisibility());
    const pulseCloudSystem = registerDecorativeSystem({
      getCenter(target) {
        return pulseCloudGroup.getWorldPosition(target);
      },
      group: pulseCloudGroup,
      importance: "backsideDecor",
      isCloudGroup: true,
      name: "pulseClouds",
      radius: 122,
    });
    setShadowParticipation(pulseCloudGroup);
    const oa = { scrollTarget: 0, scroll: 0, width: window.innerWidth, height: window.innerHeight },
      compositionState = { profile: fallbackComposition, zoom: sceneTunerDefaults.defaultZoom },
      aa = 1.15,
      cloudCameraVector = new THREE.Vector3(),
      cloudViewVector = new THREE.Vector3(),
      cloudOffsetVector = new THREE.Vector3(),
      cloudLookTarget = new THREE.Vector3();
    function resolveSceneCompositionProfile() {
      return typeof t.getSceneCompositionProfile === "function"
        ? t.getSceneCompositionProfile({
            width: oa.width,
            height: oa.height,
            zoom: compositionState.zoom,
          })
        : fallbackComposition;
    }
    function applySceneComposition(profile, reason = "runtime") {
      compositionState.profile = profile || fallbackComposition;
      const cameraProfile = compositionState.profile.camera || fallbackComposition.camera;
      R.fov = cameraProfile.fov;
      R.aspect = oa.width / oa.height;
      R.updateProjectionMatrix();
      ye.position.y = compositionState.profile.sceneOffsetY;
      cloudAnchor.position.y = compositionState.profile.cloudAnchorY;
      _e.scale.setScalar(compositionState.profile.towerScale || 1);
      updateSceneDebug({
        composition: compositionState.profile.name,
        compositionReason: reason,
        manualZoom: compositionState.zoom,
      });
    }
    t.getSceneZoom = function () {
      return compositionState.zoom;
    };
    t.getSceneZoomRange = function () {
      return {
        defaultZoom: sceneTunerDefaults.defaultZoom,
        maxZoom: sceneTunerDefaults.maxZoom,
        minZoom: sceneTunerDefaults.minZoom,
      };
    };
    t.setSceneZoom = function (value, reason = "manual") {
      const clampZoom =
        typeof t.clampSceneTunerZoom === "function"
          ? t.clampSceneTunerZoom
          : (candidate, fallback = compositionState.zoom) => {
              const numeric = Number(candidate);
              return Number.isFinite(numeric) ? numeric : fallback;
            };
      const nextZoom = clampZoom(value, compositionState.zoom);
      compositionState.zoom = nextZoom;
      applySceneComposition(resolveSceneCompositionProfile(), reason);
      return nextZoom;
    };
    function cloudViewFade(e, t, a, r, n, s = 0.92, minOpacity = 0.14) {
      const i = cloudCameraVector.copy(e).distanceTo(R.position),
        l = Math.min(1, Math.max(0, (i - t) / a));
      cloudViewVector.copy(cloudLookTarget).sub(R.position);
      const h = cloudViewVector.length();
      if (!(h > 1e-3)) return l;
      (cloudViewVector.multiplyScalar(1 / h), cloudOffsetVector.copy(e).sub(R.position));
      const c = cloudOffsetVector.dot(cloudViewVector);
      if (c <= 0 || c >= h * s) return l;
      const d = cloudOffsetVector.addScaledVector(cloudViewVector, -c).length(),
        w = Math.min(1, Math.max(0, (d - r) / n));
      return Math.max(minOpacity, Math.min(l, w));
    }
    function updateDecorativeVisibility() {
      const debugSystems = qualityDebug ? {} : null;
      let cloudVisibilityDirty = false;

      if (visibilityTracker) {
        visibilityTracker.updateCameraState();
      }

      decorativeSystems.forEach((system) => {
        if (!visibilityTracker || system.importance === "core") {
          system.active = true;
          system.bucket = system.importance === "core" ? "core" : system.bucket;
        } else {
          const center = system.getCenter(system._center || (system._center = new THREE.Vector3()));
          system.bucket = visibilityTracker.classifySphere({
            center,
            importance: system.importance,
            previousBucket: system.bucket,
            radius: system.radius || 0,
          });
          system.active = visibilityTracker.shouldUpdateBucket(system.bucket);
        }

        if (system.group) {
          if (system.isCloudGroup) {
            setCloudGroupSceneVisibility(system.group, system.active);
            cloudVisibilityDirty = true;
          } else {
            system.group.visible = visibilityTracker
              ? visibilityTracker.shouldRenderBucket(system.bucket)
              : system.active;
          }
        }

        if (debugSystems) {
          debugSystems[system.name] = { active: system.active, bucket: system.bucket };
        }
      });

      if (cloudVisibilityDirty) {
        applyCloudVisibility();
      }

      if (debugSystems) {
        qualityDebug.systems = debugSystems;
      }
    }
    function ra() {
      ((oa.width = window.innerWidth),
        (oa.height = window.innerHeight),
        applySceneComposition(resolveSceneCompositionProfile(), "resize"),
        applyActiveQualityProfile(i.profile, "resize"),
        b.setSize(oa.width, oa.height));
    }
    (window.addEventListener("resize", ra),
      window.addEventListener(
        "scroll",
        () => {
          oa.scrollTarget = Math.min(window.scrollY / (1.8 * window.innerHeight), 1.25);
        },
        { passive: !0 },
      ),
      ra());
    const na = new THREE.Clock(),
      sa = 0.12 * Math.PI;
    !(function e() {
      if ((requestAnimationFrame(e), document.hidden || !sceneVisible)) return;
      const n = Math.min(0.1, na.getDelta()),
        o = na.elapsedTime;
      const adaptiveProfile =
        typeof qualityState.sample === "function" ? qualityState.sample(1e3 * n, 1e3 * o) : null;
      adaptiveProfile &&
        adaptiveProfile.tier !== i.profile.tier &&
        applyActiveQualityProfile(adaptiveProfile, "adaptive");
      const activeProfile = i.profile,
        cameraProfile = compositionState.profile.camera || fallbackComposition.camera,
        r = reducedMotionMQ.matches ? 0.25 : 1;
      oa.scroll += 0.025 * (oa.scrollTarget - oa.scroll);
      const s = activeProfile.isLow ? 0.055 : 0.06,
        l = o * (0.95 * s) * r,
        h = 0.09 * Math.sin(3 * l) + 0.05 * Math.sin(2 * l),
        c = sa + l - h,
        d = cameraProfile.orbitBase - cameraProfile.orbitScrollDelta * oa.scroll,
        w =
          cameraProfile.heightBase +
          cameraProfile.heightScrollDelta * oa.scroll +
          0.45 * Math.sin(0.28 * o) * r +
          0.6 * Math.sin(0.13 * o) * r,
        p = cameraProfile.lookAtBase + cameraProfile.lookAtScrollDelta * oa.scroll,
        M = cameraProfile.orbitScale * (d - cameraProfile.orbitTrim);
      (R.position.set(Math.cos(c) * M, w, Math.sin(c) * M),
        (cloudAnchor.position.x = R.position.x),
        (cloudAnchor.position.z = R.position.z),
        cloudLookTarget.set(0, p, 0),
        R.lookAt(0, p, 0),
        updateDecorativeVisibility(),
        (lo.material.opacity = 0.12 + 0.02 * Math.sin(1.3 * o) * r),
        ho.forEach((e, t) => {
          ((e.rotation.z = o * (0.1 + 0.02 * t) * r),
            (e.material.opacity =
              0.12 + 0.018 * t + 0.03 + 0.02 * Math.sin(o * (1.2 + 0.3 * t)) * r));
        }),
        fo.forEach((e, t) => {
          ((e.rotation.y += 0.0035 + 12e-5 * t),
            (e.position.y =
              a(e.position.x, e.position.z) + 3.55 + 0.06 * Math.sin(1.4 * o + t) * r));
        }),
        To.children.forEach((e, t) => {
          e.rotation.y += 0.002 + 5e-4 * t;
        }),
        (Io.rotation.y = 0.02 * o * r),
        (Io.material.opacity = (i.lowPower ? 0.42 : 0.5) * aa),
        (driftCloudSystem.active
          ? (() => {
              const limit = getProfileCount("driftClouds", driftClouds.length);
              driftClouds.forEach((e, t) => {
                if (t >= limit) {
                  e.mesh.visible = !1;
                  return;
                }
                e.mesh.visible = !0;
                const a = Math.sin(o * e.speed * r + e.phase),
                  n = Math.cos(o * (0.56 * e.speed) * r + 0.8 * e.phase),
                  s = e.yaw + 0.05 * a,
                  l = e.radius + 0.18 * n;
                ((e.mesh.position.x = Math.cos(s) * l + 0.14 * e.drift),
                  (e.mesh.position.z = Math.sin(s) * l + 0.14 * e.drift),
                  (e.mesh.position.y =
                    e.baseY + a * e.ampY * 0.55 + 0.07 * Math.sin(0.9 * o + t)));
                e.mesh.material.opacity =
                  (i.lowPower ? 0.14 : 0.19) * aa + (0.018 + 0.0016 * t) * Math.max(0, a);
              });
            })()
          : setRecordVisibility(driftClouds, !1)),
        (upperGlowSystem.active
          ? (() => {
              const limit = getProfileCount("upperGlowSprites", et.length);
              et.forEach((e, t) => {
                if (t >= limit) {
                  e.mesh.visible = !1;
                  return;
                }
                e.mesh.visible = !0;
                const a = o * e.speed * r + e.phase,
                  n = e.yaw + 0.04 * Math.sin(a),
                  s = e.radius + 1.6 * Math.cos(0.8 * a);
                ((e.mesh.position.x = Math.cos(n) * s),
                  (e.mesh.position.z = Math.sin(n) * s),
                  (e.mesh.position.y = e.baseY + 0.35 * Math.sin(0.6 * a + 0.3 * t)),
                  (e.mesh.material.opacity =
                    (i.lowPower ? 0.16 : 0.26) + 0.02 * Math.sin(0.7 * a)));
              });
            })()
          : setRecordVisibility(et, !1)),
        (midCloudSystem.active
          ? (() => {
              const limit = getProfileCount("midCloudSprites", at.length);
              at.forEach((e, t) => {
                if (t >= limit) {
                  e.mesh.visible = !1;
                  return;
                }
                e.mesh.visible = !0;
                const a = o * e.speed * r + e.phase,
                  n = e.yaw + 0.025 * Math.sin(0.7 * a),
                  s = e.radius + 2.5 * Math.cos(0.6 * a);
                ((e.mesh.position.x = Math.cos(n) * s),
                  (e.mesh.position.z = Math.sin(n) * s),
                  (e.mesh.position.y = e.baseY + 0.5 * Math.sin(0.5 * a + 0.24 * t)));
                const h = cloudViewFade(
                  e.mesh.position,
                  i.lowPower ? 32 : 38,
                  14,
                  i.lowPower ? 10 : 13,
                  i.lowPower ? 10 : 13,
                  0.95,
                  0.02,
                );
                e.mesh.material.opacity = e.baseOpacity * h;
              });
            })()
          : setRecordVisibility(at, !1)),
        ht.forEach((e, t) => {
          const a = o * (0.9 + (t % 7) * 0.05) * r + e.phase;
          ((e.mesh.position.y = e.baseY + Math.sin(a) * e.amp),
            (e.mesh.material.opacity = (i.lowPower ? 0.26 : 0.33) + 0.03 * Math.sin(0.7 * a)));
        }),
        (emberCloudSystem.active
          ? (() => {
              const limit = getProfileCount("emberClouds", emberClouds.length);
              emberClouds.forEach((e, t) => {
                if (t >= limit) {
                  e.mesh.visible = !1;
                  return;
                }
                e.mesh.visible = !0;
                const a = o * e.speed * r + e.phase,
                  n = e.yaw + 0.06 * Math.sin(0.42 * a),
                  s = e.radius + 0.35 * Math.cos(0.35 * a);
                ((e.mesh.position.x = Math.cos(n) * s + e.drift),
                  (e.mesh.position.z = Math.sin(n) * s + e.drift),
                  (e.mesh.position.y =
                    e.baseY + Math.sin(1.1 * a) * e.ampY + 0.18 * Math.max(0, Math.sin(0.9 * a))),
                  (e.mesh.material.opacity =
                    (i.lowPower ? 0.08 : 0.11) * aa +
                    0.03 +
                    0.035 * Math.max(0, Math.sin(1.8 * a + 0.2 * t))));
              });
            })()
          : setRecordVisibility(emberClouds, !1)),
        Nt.forEach((e) => {
          const t = e.phase,
            a = Math.sin(6 * o + t),
            r = Math.sin(9.3 * o + 1.7 * t),
            n = Math.sin(14.1 * o + 0.8 * t),
            s = Math.sin(3.2 * o + 2.1 * t),
            hf = Math.sin(22 * o + 3.1 * t),
            br = Math.sin(0.8 * o + 0.6 * t),
            i = 0.12 * a + 0.08 * r + 0.05 * n + 0.04 * hf + 0.06 * br,
            l = 0.06 * Math.sin(2.5 * o + t) + 0.03 * Math.sin(4.8 * o + 1.4 * t);
          ((e.flameCore.material.opacity = 0.8 * Math.max(0.45, 0.7 + i + 0.1 * n)),
            (e.flameCore.position.y = e.baseFlameY + 0.08 * a + 0.04 * r),
            (e.flameCore.position.x = e.baseX + l),
            (e.flameCore.position.z = e.baseZ + 0.03 * Math.sin(3.1 * o + 0.9 * t)));
          const h = Math.min(1.22, Math.max(0.78, 1 + 0.15 * a + 0.08 * n + 0.05 * br));
          (e.flameCore.scale.set(0.8 * Math.min(1.2, Math.max(0.82, 1 + 0.12 * r)), 1.4 * h, 1),
            (e.flameOuter.material.opacity =
              0.8 * Math.max(0.22, 0.35 + 0.08 * s + 0.06 * a + 0.04 * br)),
            (e.flameOuter.position.y = e.baseFlameY - 0.2 + 0.06 * s),
            (e.flameOuter.position.x = e.baseX + 0.6 * l),
            (e.flameOuter.position.z = e.baseZ + 0.02 * Math.sin(2.2 * o + 1.2 * t)),
            e.flameOuter.scale.set(
              1.6 * Math.min(1.18, Math.max(0.9, 1 + 0.1 * s)),
              2.4 * Math.min(1.18, Math.max(0.9, 1 + 0.1 * a)),
              1,
            ));
          if (e.flameHot) {
            const hotOp = Math.max(0.55, 0.78 + 0.12 * a + 0.08 * hf + 0.04 * br);
            ((e.flameHot.material.opacity = 0.95 * hotOp),
              e.flameHot.position.set(
                e.baseX + 0.4 * l,
                e.baseFlameY + 0.15 + 0.06 * a,
                e.baseZ + 0.02 * Math.sin(3.1 * o + 0.9 * t),
              ));
            const hotScale = Math.min(1.18, Math.max(0.82, 1 + 0.1 * a));
            e.flameHot.scale.set(0.4 * hotScale, 0.7 * Math.min(1.2, Math.max(0.8, h)), 1);
          }
          if (e.groundRing) {
            const ringOp = 0.07 + 0.045 * Math.max(0, 0.5 + 0.5 * a) + 0.03 * br;
            e.groundRing.material.opacity = ringOp;
            const ringScale = 1 + 0.08 * a + 0.05 * br;
            e.groundRing.scale.set(ringScale, ringScale, 1);
          }
          if (e.embers && e.embers.length) {
            e.embers.forEach((t) => {
              const a = o * t.speed + t.phase,
                r = (a * 0.25) % 1;
              t.mesh.position.set(
                e.baseX + t.driftX * r + 0.08 * Math.sin(3.4 * a),
                e.baseFlameY + 0.3 + 2.6 * r,
                e.baseZ + t.driftZ * r + 0.08 * Math.cos(2.7 * a),
              );
              const n = Math.max(0, (1 - r) * (0.7 + 0.3 * Math.sin(5 * a)));
              t.mesh.material.opacity = n;
              const s = t.size * (0.6 + 0.8 * (1 - r));
              t.mesh.scale.set(s, s, 1);
            });
          }
          if (e.light) {
            const t = e.baseIntensity || 0.4,
              f = Math.max(0, 0.5 + 0.5 * a);
            ((e.light.intensity = 0.8 * (t + i * t * 1.8 + n * t * 0.35)),
              (e.light.position.y = e.baseFlameY + 0.06 * a),
              e.light.color.setHSL((20 + 12 * f) / 360, 0.82, 0.52 + 0.06 * f));
          }
        }),
        (plumeSystem.active
          ? (() => {
              const limit = getProfileCount("plumeColumns", Yt.length);
              Yt.forEach((e, t) => {
                if (t >= limit) {
                  e.mesh.visible = !1;
                  return;
                }
                e.mesh.visible = !0;
                const a = o * e.driftSpeed * r + e.phase,
                  n = (o * e.riseSpeed * 0.12) % e.cycleHeight;
                e.mesh.position.y = e.baseY + n;
                const s = e.haze ? 0.18 : 0.35,
                  i2 = s * Math.sin(0.6 * a);
                ((e.mesh.position.x = Math.cos(e.angle) * e.radius + i2),
                  (e.mesh.position.z =
                    Math.sin(e.angle) * e.radius + (e.haze ? 0.12 : 0.22) * Math.cos(0.4 * a)));
                const l = n / e.cycleHeight;
                if (e.haze) {
                  e.mesh.material.color.setRGB(
                    0.42 + 0.22 * l,
                    0.39 + 0.21 * l,
                    0.35 + 0.19 * l,
                  );
                } else {
                  e.mesh.material.color.setRGB(
                    0.28 + 0.5 * l,
                    0.25 + 0.48 * l,
                    0.22 + 0.44 * l,
                  );
                }
                const h = e.haze ? 1 + 0.25 * l : 1 + 0.6 * l;
                e.mesh.scale.set(e.baseScaleX * h, e.baseScaleY * h, 1);
                const c = e.haze ? 0.85 - 0.35 * l : 1 - l * l;
                e.mesh.material.opacity = e.baseOpacity * c * (0.82 + 0.18 * Math.sin(0.8 * a));
              });
            })()
          : setRecordVisibility(Yt, !1)),
        (hazeCloudSystem.active
          ? (() => {
              const limit = getProfileCount("hazeClouds", hazeClouds.length);
              hazeClouds.forEach((e, t) => {
                if (t >= limit) {
                  e.mesh.visible = !1;
                  return;
                }
                e.mesh.visible = !0;
                const a = o * e.speed * r + e.phase,
                  n = (o * e.speed * 0.15) % e.cycleHeight;
                ((e.mesh.position.y = e.baseY + n),
                  (e.mesh.position.x = Math.cos(e.yaw + 0.06 * Math.sin(0.4 * a)) * e.radius),
                  (e.mesh.position.z = Math.sin(e.yaw + 0.06 * Math.sin(0.4 * a)) * e.radius));
                e.mesh.material.opacity =
                  (i.lowPower ? 0.08 : 0.12) * aa + 0.02 * Math.sin(0.5 * a);
              });
            })()
          : setRecordVisibility(hazeClouds, !1)),
        (pulseCloudSystem.active
          ? (() => {
              const limit = getProfileCount("pulseClouds", pulseClouds.length);
              pulseClouds.forEach((e, t) => {
                if (t >= limit) {
                  e.puffs.forEach((puff) => {
                    puff.sprite.visible = !1;
                  });
                  return;
                }
                const a = ((o + e.cycleOffset) % e.cyclePeriod) / e.cyclePeriod,
                  n = e.fadeInDuration / e.cyclePeriod,
                  s = n + e.holdDuration / e.cyclePeriod,
                  iEnd = s + e.fadeOutDuration / e.cyclePeriod;
                let l = 0;
                (a < n
                  ? (l = a / n)
                  : a < s
                    ? (l = 1)
                    : a < iEnd && (l = 1 - (a - s) / (iEnd - s)),
                  (l = l * l * (3 - 2 * l)));
                const h = 0.02 * o + 2.8 * t,
                  c = e.baseAngle + Math.sin(h) * e.angleDriftAmp,
                  d = e.baseDist + Math.cos(0.7 * h) * e.distDriftAmp,
                  baseVis = l * r * (i.lowPower ? 0.4 : 0.55);
                for (let p = 0; p < e.puffs.length; p++) {
                  const puff = e.puffs[p],
                    localAngle = c + puff.aOff,
                    localDist = d + puff.rOff,
                    breathe = 1 + 0.04 * Math.sin(0.3 * o + 1.9 * t + 0.7 * p);
                  puff.sprite.visible = !0;
                  (puff.sprite.position.x = Math.cos(localAngle) * localDist),
                    (puff.sprite.position.z = Math.sin(localAngle) * localDist),
                    (puff.sprite.position.y = e.baseY + puff.hOff),
                    (puff.sprite.material.opacity =
                      baseVis * (0.75 + 0.25 * Math.sin(0.25 * o + 1.3 * p + t)) * breathe);
                }
              });
            })()
          : (() => {
              pulseClouds.forEach((e) => {
                e.puffs.forEach((puff) => {
                  puff.sprite.visible = !1;
                });
              });
            })()));
      if (haloSystem.active) {
        const haloPulse = 1 + 0.012 * Math.sin(1.3 * o) + 0.006 * Math.sin(2.9 * o);
        const haloLimit =
            getProfileCount("haloSprites", 0) +
            getProfileCount("haloBands", 0) +
            getProfileCount("haloTwisters", 0),
          orbitalLimit = getProfileCount("orbitalGlowLayers", te.length);
        (F.scale.set(6.5 * haloPulse, 6.5 * haloPulse, 1),
          (A.rotation = 0.07 * o),
          B.scale.set(13 * haloPulse, 13 * haloPulse, 1),
          (B.material.opacity = 0.55 + 0.06 * Math.sin(2.1 * o)),
          (B.material.rotation = 0.06 * -o),
          G.scale.set(20 * haloPulse, 20 * haloPulse, 1),
          (G.material.opacity = 0.32 + 0.05 * Math.sin(0.7 * o)),
          (I.rotation.z = 0.02 * o),
          R.matrixWorld.extractBasis(Q, J, K));
        for (let haloIndex = 0; haloIndex < D.length; haloIndex += 1) {
          const haloRecord = D[haloIndex];
          if (haloIndex >= haloLimit) {
            haloRecord.sprite.visible = !1;
            continue;
          }
          haloRecord.sprite.visible = !0;
          const orbitTheta =
              haloRecord.theta +
              o * haloRecord.orbitSpeed +
              0.25 * Math.sin(o * haloRecord.wobbleFreq * 0.4 + haloRecord.phase) +
              0.15 * Math.sin(o * haloRecord.wobble2Freq * 0.3 + 2.3 * haloRecord.phase),
            orbitPhi = haloRecord.phi + 0.15 * Math.sin(0.3 * o + haloRecord.phase);
          let orbitRadius =
            haloRecord.orbitRadius +
            Math.sin(o * haloRecord.wobbleFreq * 0.5 + haloRecord.phase) * haloRecord.wobbleAmp +
            Math.sin(o * haloRecord.wobble2Freq * 0.3 + 1.7 * haloRecord.phase) * haloRecord.wobble2Amp;
          const violencePhase = o * haloRecord.violenceFreq + haloRecord.violencePhase,
            violenceBoost =
              Math.pow(Math.max(0, Math.sin(violencePhase)), 12) * haloRecord.violenceAmp;
          orbitRadius += violenceBoost;
          const orbitX = Math.cos(orbitTheta) * Math.sin(orbitPhi) * orbitRadius,
            orbitY = Math.cos(orbitPhi) * orbitRadius;
          haloRecord.sprite.position.set(
            Q.x * orbitX + J.x * orbitY,
            Q.y * orbitX + J.y * orbitY,
            Q.z * orbitX + J.z * orbitY,
          );
          const haloScale =
              haloRecord.baseScale * (0.85 + 0.15 * Math.sin(1.5 * o + haloRecord.phase)),
            violenceScale = violenceBoost > 0.5 ? 0.15 : 0;
          (haloRecord.sprite.scale.set(
            haloScale + violenceScale,
            haloScale + violenceScale,
            1,
          ),
            (haloRecord.sprite.material.opacity =
              (0 === haloRecord.layer ? 0.28 : 1 === haloRecord.layer ? 0.18 : 0.1) +
              0.06 * Math.sin(1.8 * o + haloRecord.phase) +
              0.5 * violenceScale));
          const colorPhase = (o * haloRecord.colorSpeed + haloRecord.colorPhase) % 1,
            colorWave = 0.5 * Math.sin(colorPhase * Math.PI * 2) + 0.5,
            colorGreen = 0.45 + 0.55 * colorWave,
            colorBlue = 0.1 + colorWave * colorWave * 0.6;
          haloRecord.sprite.material.color.setRGB(1, colorGreen, colorBlue);
        }
        for (let orbitalIndex = 0; orbitalIndex < te.length; orbitalIndex += 1) {
          const orbitalRecord = te[orbitalIndex];
          if (orbitalIndex >= orbitalLimit) {
            orbitalRecord.mesh.visible = !1;
            continue;
          }
          orbitalRecord.mesh.visible = !0;
          const growTime = orbitalRecord.growTime,
            holdTime = orbitalRecord.holdTime,
            shrinkTime = orbitalRecord.noReturn
              ? 2.5 * orbitalRecord.shrinkTime
              : orbitalRecord.shrinkTime,
            cycleTime = growTime + holdTime + shrinkTime + orbitalRecord.pauseTime,
            cyclePhase = (o + orbitalRecord.phase) % cycleTime;
          let glowAmount = 0;
          if ((orbitalRecord.mesh.scale.set(1, 1, 1), cyclePhase < growTime)) {
            const growProgress = cyclePhase / growTime;
            glowAmount = 1 - Math.pow(1 - growProgress, 3);
          } else if (cyclePhase < growTime + holdTime) glowAmount = 1;
          else {
            if (!(cyclePhase < growTime + holdTime + shrinkTime)) {
              orbitalRecord.mesh.material.opacity = 0;
              continue;
            }
            glowAmount = 1 - (cyclePhase - growTime - holdTime) / shrinkTime;
          }
          orbitalRecord.mesh.material.opacity = 0.55;
          const colorArray = orbitalRecord.geo.attributes.color.array;
          for (let colorIndex = 0; colorIndex < orbitalRecord.heightFracs.length; colorIndex += 1) {
            const heightFrac = orbitalRecord.heightFracs[colorIndex];
            let colorFade = Math.max(0, Math.min(1, (glowAmount - heightFrac) / 0.15 + 0.5));
            colorFade = colorFade * colorFade * (3 - 2 * colorFade);
            (colorArray[3 * colorIndex + 0] = orbitalRecord.baseColors[3 * colorIndex + 0] * colorFade),
              (colorArray[3 * colorIndex + 1] = orbitalRecord.baseColors[3 * colorIndex + 1] * colorFade),
              (colorArray[3 * colorIndex + 2] = orbitalRecord.baseColors[3 * colorIndex + 2] * colorFade);
          }
          orbitalRecord.geo.attributes.color.needsUpdate = !0;
        }
      } else {
        setRecordVisibility(te, !1);
        D.forEach((e) => {
          e.sprite.visible = !1;
        });
      }
      ((x.material.uniforms.uTime.value = o), b.render(T, R));
    })();
  };
})();
