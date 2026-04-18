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
      return panel.querySelector(".panel-card");
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
