(() => {
  const e = (window.BabelSite = window.BabelSite || {});
  (e.ui = e.ui || {}).initPanels = function () {
    const e = Array.from(document.querySelectorAll(".bottom-btn[data-panel]")),
      t = Array.from(document.querySelectorAll(".panel-overlay"));
    if (!e.length || !t.length) return;
    const n = window.matchMedia("(prefers-reduced-motion: reduce)");
    let o = null;
    function r(t = null) {
      e.forEach((e) => {
        e.setAttribute("aria-expanded", e.dataset.panel === t ? "true" : "false");
      });
    }
    function c(e) {
      e.classList.contains("open") || (e.hidden = !0);
    }
    function i({ restoreFocus: e = !0 } = {}) {
      if (
        (t.forEach((e) => {
          if (e.hidden) return;
          if ((e.classList.remove("open"), n.matches)) return void c(e);
          const t = (n) => {
            n.target === e && (e.removeEventListener("transitionend", t), c(e));
          };
          (e.addEventListener("transitionend", t),
            window.setTimeout(() => {
              (e.removeEventListener("transitionend", t), c(e));
            }, 420));
        }),
        r(),
        e && o)
      )
        try {
          o.focus({ preventScroll: !0 });
        } catch (e) {
          o.focus();
        }
      e && (o = null);
    }
    (e.forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.panel,
          n = "true" === e.getAttribute("aria-expanded");
        t &&
          (n
            ? i()
            : (function (e, t) {
                const n = document.getElementById(`panel-${e}`);
                if (!n) return;
                (i({ restoreFocus: !1 }),
                  (o = t),
                  (n.hidden = !1),
                  n.offsetWidth,
                  n.classList.add("open"),
                  r(e));
                const c = n.querySelector(".panel-close");
                if (c)
                  try {
                    c.focus({ preventScroll: !0 });
                  } catch (e) {
                    c.focus();
                  }
              })(t, e));
      });
    }),
      document.querySelectorAll(".panel-close").forEach((e) => {
        e.addEventListener("click", () => i());
      }),
      t.forEach((e) => {
        e.addEventListener("click", (t) => {
          t.target === e && i();
        });
      }),
      document.addEventListener("keydown", (e) => {
        "Escape" === e.key && i();
      }));
  };
})();
