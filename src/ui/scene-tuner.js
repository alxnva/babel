(() => {
  const site = (window.BabelSite = window.BabelSite || {});
  const ui = (site.ui = site.ui || {});

  const FALLBACK_DEFAULTS = {
    defaultVisible: true,
    defaultZoom: 12,
    maxZoom: 18,
    minZoom: -12,
    storageKeys: {
      visible: "babel.sceneTuner.visible.v2",
      zoom: "babel.sceneTuner.zoom.v2",
    },
  };

  function getSceneApi() {
    return window.BabelSite?.scene || {};
  }

  function clampZoom(value, fallback = FALLBACK_DEFAULTS.defaultZoom) {
    const sceneApi = getSceneApi();
    if (typeof sceneApi.clampSceneTunerZoom === "function") {
      return sceneApi.clampSceneTunerZoom(value, fallback);
    }
    const numericValue = Number(value);
    const safeValue = Number.isFinite(numericValue) ? numericValue : fallback;
    return Math.min(FALLBACK_DEFAULTS.maxZoom, Math.max(FALLBACK_DEFAULTS.minZoom, Math.round(safeValue)));
  }

  function readVisibility(value, fallback = true) {
    if (value === "1" || value === "true") return true;
    if (value === "0" || value === "false") return false;
    return fallback;
  }

  function resolveDefaults(defaults = {}) {
    const sceneApi = getSceneApi();
    const sceneDefaults =
      typeof sceneApi.getSceneTunerDefaults === "function" ? sceneApi.getSceneTunerDefaults() : {};

    return {
      ...FALLBACK_DEFAULTS,
      ...sceneDefaults,
      ...defaults,
      storageKeys: {
        ...FALLBACK_DEFAULTS.storageKeys,
        ...(sceneDefaults.storageKeys || {}),
        ...(defaults.storageKeys || {}),
      },
    };
  }

  function resolveStorage(storage = window.localStorage) {
    try {
      return storage && typeof storage.getItem === "function" && typeof storage.setItem === "function"
        ? storage
        : null;
    } catch (_err) {
      return null;
    }
  }

  function createSceneTunerStore({ defaults = {}, storage = resolveStorage() } = {}) {
    const settings = resolveDefaults(defaults);
    const initialZoom = storage ? storage.getItem(settings.storageKeys.zoom) : null;
    const initialVisible = storage ? storage.getItem(settings.storageKeys.visible) : null;
    let state = {
      visible: readVisibility(initialVisible, settings.defaultVisible),
      zoom: clampZoom(initialZoom, settings.defaultZoom),
    };

    function persist() {
      if (!storage) return;
      try {
        storage.setItem(settings.storageKeys.zoom, String(state.zoom));
        storage.setItem(settings.storageKeys.visible, state.visible ? "1" : "0");
      } catch (_err) {
        // Ignore storage failures so the control still works in private or restricted contexts.
      }
    }

    return {
      getState() {
        return { ...state };
      },
      setVisible(value) {
        state = { ...state, visible: !!value };
        persist();
        return state.visible;
      },
      setZoom(value) {
        state = { ...state, zoom: clampZoom(value, state.zoom) };
        persist();
        return state.zoom;
      },
      toggleVisible() {
        state = { ...state, visible: !state.visible };
        persist();
        return state.visible;
      },
    };
  }

  function describeZoom(zoom, defaults) {
    if (zoom >= defaults.defaultZoom + 5) return "Extra wide";
    if (zoom >= defaults.defaultZoom + 1) return "Wide";
    if (zoom <= defaults.defaultZoom - 5) return "Close";
    if (zoom < defaults.defaultZoom) return "Near";
    return "Balanced";
  }

  ui.createSceneTunerStore = createSceneTunerStore;
  ui.initSceneTuner = function initSceneTuner() {
    const root = document.getElementById("scene-tuner");
    const toggle = document.getElementById("scene-tuner-toggle");
    const action = document.getElementById("scene-tuner-action");
    const panel = document.getElementById("scene-tuner-panel");
    const slider = document.getElementById("scene-zoom-slider");
    const value = document.getElementById("scene-tuner-value");

    if (!root || !toggle || !action || !panel || !slider || !value) return null;

    const defaults = resolveDefaults();
    const store = createSceneTunerStore({ defaults });

    slider.min = String(defaults.minZoom);
    slider.max = String(defaults.maxZoom);
    slider.step = "1";

    function syncScene(reason = "scene-tuner") {
      const sceneApi = getSceneApi();
      if (typeof sceneApi.setSceneZoom === "function") {
        sceneApi.setSceneZoom(store.getState().zoom, reason);
      }
    }

    function render() {
      const state = store.getState();
      root.hidden = false;
      root.dataset.open = state.visible ? "true" : "false";
      panel.hidden = !state.visible;
      slider.value = String(state.zoom);
      action.textContent = state.visible ? "Hide" : "Show";
      value.textContent = describeZoom(state.zoom, defaults);
      toggle.setAttribute("aria-expanded", state.visible ? "true" : "false");
      toggle.setAttribute("aria-label", state.visible ? "Hide zoom slider" : "Show zoom slider");
    }

    slider.addEventListener("input", () => {
      const zoom = store.setZoom(slider.value);
      render();
      syncScene("scene-tuner-input");
      return zoom;
    });

    toggle.addEventListener("click", () => {
      store.toggleVisible();
      render();
    });

    ui.getSceneTunerState = function getSceneTunerState() {
      return store.getState();
    };
    ui.getSceneZoom = function getSceneZoom() {
      return store.getState().zoom;
    };
    ui.isSceneTunerVisible = function isSceneTunerVisible() {
      return store.getState().visible;
    };
    ui.setSceneZoom = function setSceneZoom(value) {
      const zoom = store.setZoom(value);
      render();
      syncScene("scene-tuner-set");
      return zoom;
    };
    ui.setSceneTunerVisible = function setSceneTunerVisible(value) {
      const visible = store.setVisible(value);
      render();
      return visible;
    };

    render();
    syncScene("scene-tuner-init");
    return { defaults, store };
  };
})();
