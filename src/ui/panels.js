(() => {
  const site = (window.BabelSite = window.BabelSite || {});
  const ui = (site.ui = site.ui || {});
  const BACKGROUND_SELECTORS = [
    ".skip-link",
    ".scene-shell",
    ".site-shell",
    "main",
    ".bottom-bar",
    ".site-copyright",
  ];
  const FOCUSABLE_SELECTOR =
    'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

  function focusElement(element) {
    if (!element) return;

    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus();
    }
  }

  const SCRAMBLE_CHARSET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
    "\u16A0\u16A2\u16A6\u16A8\u16B1\u16B2\u16B7\u16B9\u16BA\u16BE" +
    "\u16C1\u16C3\u16C7\u16C8\u16CA\u16CB\u16CF\u16D2\u16D6\u16D7\u16DA\u16DF" +
    "\u0391\u0392\u0393\u0394\u0395\u0398\u039B\u039E\u03A0\u03A3\u03A6\u03A8\u03A9" +
    "\u1680\u1681\u1682\u1683\u1684\u1685\u1686\u1687\u1688\u1689\u168A\u168B";
  const SCRAMBLE_TOTAL_MS = 900;
  const SCRAMBLE_MIN_STEP_MS = 18;
  const SCRAMBLE_RUN = Symbol("scrambleRun");

  function randomScrambleChar() {
    return SCRAMBLE_CHARSET[Math.floor(Math.random() * SCRAMBLE_CHARSET.length)];
  }

  // Cache the true original nodeValue the first time we see a text node.
  // Without this, a mid-scramble close leaves partially-random glyphs in the
  // DOM; the next open captures that polluted state as "original" and reveals
  // to it — locking random chars in permanently.
  const ORIGINAL_TEXT = new WeakMap();

  function collectScrambleTargets(root) {
    const targets = [];
    const containers = root.querySelectorAll("[data-scramble]");
    containers.forEach((container) => {
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const current = node.nodeValue;
        if (current && /[A-Za-z]/.test(current)) {
          let original = ORIGINAL_TEXT.get(node);
          if (original === undefined) {
            original = current;
            ORIGINAL_TEXT.set(node, original);
          }
          targets.push({ node, original });
        }
        node = walker.nextNode();
      }
    });
    return targets;
  }

  function scramblePanel(panel) {
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = collectScrambleTargets(panel);
    if (!targets.length) return;

    if (reduce) {
      targets.forEach(({ node, original }) => {
        node.nodeValue = original;
      });
      return;
    }

    const runId = Symbol("run");
    panel[SCRAMBLE_RUN] = runId;

    const schedule = [];
    let totalLetters = 0;
    targets.forEach((target) => {
      for (let idx = 0; idx < target.original.length; idx += 1) {
        if (/[A-Za-z]/.test(target.original[idx])) totalLetters += 1;
      }
    });
    const stepMs = totalLetters
      ? Math.max(SCRAMBLE_MIN_STEP_MS, SCRAMBLE_TOTAL_MS / totalLetters)
      : SCRAMBLE_MIN_STEP_MS;

    let globalOrder = 0;
    targets.forEach(({ node, original }) => {
      const scrambled = original
        .split("")
        .map((ch) => (/[A-Za-z]/.test(ch) ? randomScrambleChar() : ch));
      node.nodeValue = scrambled.join("");
      for (let idx = 0; idx < original.length; idx += 1) {
        const ch = original[idx];
        if (!/[A-Za-z]/.test(ch)) continue;
        schedule.push({ node, charIdx: idx, char: ch, orderIdx: globalOrder });
        globalOrder += 1;
      }
    });

    schedule.sort((aa, bb) => aa.orderIdx - bb.orderIdx);
    schedule.forEach(({ node, charIdx, char, orderIdx }) => {
      window.setTimeout(() => {
        if (panel[SCRAMBLE_RUN] !== runId) return;
        const current = node.nodeValue;
        node.nodeValue = current.slice(0, charIdx) + char + current.slice(charIdx + 1);
      }, orderIdx * stepMs);
    });
  }

  ui.initPanels = function initPanels() {
    const buttons = Array.from(document.querySelectorAll(".bottom-btn[data-panel]"));
    const panels = Array.from(document.querySelectorAll(".panel-overlay"));
    if (!buttons.length || !panels.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const backgroundNodes = BACKGROUND_SELECTORS.map((selector) =>
      document.querySelector(selector),
    ).filter(Boolean);

    let restoreFocusTarget = null;
    let activePanel = null;

    function setExpandedState(activePanelId = null) {
      buttons.forEach((button) => {
        button.setAttribute(
          "aria-expanded",
          button.dataset.panel === activePanelId ? "true" : "false",
        );
      });
    }

    function setBackgroundInert(isInert) {
      backgroundNodes.forEach((node) => {
        node.inert = isInert;
      });

      if (isInert) {
        document.body.setAttribute("data-panel-open", "true");
        return;
      }

      document.body.removeAttribute("data-panel-open");
    }

    function getPanelCard(panel) {
      return panel.querySelector(".panel-surface, .panel-card");
    }

    function getFocusableElements(panel) {
      return Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hidden && !element.inert,
      );
    }

    function hidePanel(panel) {
      if (!panel || panel.hidden) return;

      panel.classList.remove("open");

      const finishHide = () => {
        if (!panel.classList.contains("open")) {
          panel.hidden = true;
        }
      };

      if (reduceMotion.matches) {
        finishHide();
        return;
      }

      const onTransitionEnd = (event) => {
        if (event.target !== panel) return;
        panel.removeEventListener("transitionend", onTransitionEnd);
        finishHide();
      };

      panel.addEventListener("transitionend", onTransitionEnd);
      window.setTimeout(() => {
        panel.removeEventListener("transitionend", onTransitionEnd);
        finishHide();
      }, 420);
    }

    function focusPanel(panel) {
      const card = getPanelCard(panel);
      const closeButton = panel.querySelector(".panel-close");
      const focusable = getFocusableElements(panel);
      focusElement(closeButton || focusable[0] || card);
    }

    function closePanel({ restoreFocus = true } = {}) {
      if (activePanel) {
        activePanel[SCRAMBLE_RUN] = null;
        hidePanel(activePanel);
        activePanel = null;
      }

      setExpandedState();
      setBackgroundInert(false);

      if (restoreFocus && restoreFocusTarget) {
        focusElement(restoreFocusTarget);
      }

      if (restoreFocus) {
        restoreFocusTarget = null;
      }
    }

    function openPanel(panelId, trigger) {
      const panel = document.getElementById(`panel-${panelId}`);
      if (!panel) return;

      closePanel({ restoreFocus: false });
      restoreFocusTarget = trigger;
      activePanel = panel;
      panel.hidden = false;
      panel.offsetWidth;
      panel.classList.add("open");
      setExpandedState(panelId);
      setBackgroundInert(true);
      focusPanel(panel);
      scramblePanel(panel);
    }

    function trapFocus(event) {
      if (!activePanel || event.key !== "Tab") return;

      const focusable = getFocusableElements(activePanel);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (event.shiftKey) {
        if (current === first || !activePanel.contains(current)) {
          event.preventDefault();
          focusElement(last);
        }
        return;
      }

      if (current === last || !activePanel.contains(current)) {
        event.preventDefault();
        focusElement(first);
      }
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const panelId = button.dataset.panel;
        if (!panelId) return;

        if (button.getAttribute("aria-expanded") === "true") {
          closePanel();
          return;
        }

        openPanel(panelId, button);
      });
    });

    document.querySelectorAll(".panel-close").forEach((button) => {
      button.addEventListener("click", () => closePanel());
    });

    panels.forEach((panel) => {
      panel.addEventListener("click", (event) => {
        if (event.target === panel) {
          closePanel();
        }
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (activePanel) {
          closePanel();
        }
        return;
      }

      trapFocus(event);
    });
  };
})();
