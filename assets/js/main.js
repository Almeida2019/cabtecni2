/* ============================================================
   CABTECNI — Site behaviour
   ============================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "cabtecni-lang";
  var DEFAULT_LANG = "pt";
  var THEME_KEY = "cabtecni-theme";

  /* ---------- Theme (light default, dark alternative) ----------
     The initial theme is applied synchronously by an inline script in
     <head>, before first paint, to avoid a flash of the wrong theme.
     This just wires up the toggle button and keeps it in sync. */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  /* ---------- i18n ---------- */
  var LANGS = ["pt", "en", "es", "fr"];
  // Angolan Portuguese; the rest are plain locales.
  var HTML_LANG = { pt: "pt-AO", en: "en", es: "es", fr: "fr" };

  function getLang() {
    var saved = localStorage.getItem(STORAGE_KEY);
    return LANGS.indexOf(saved) > -1 ? saved : DEFAULT_LANG;
  }

  function applyLang(lang) {
    var dict = (typeof I18N !== "undefined" && I18N[lang]) ? I18N[lang] : {};
    document.documentElement.lang = HTML_LANG[lang] || "pt-AO";

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      if (dict[k] != null) el.textContent = dict[k];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-html");
      if (dict[k] != null) el.innerHTML = dict[k];
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var bits = pair.split(":");
        var attr = bits[0], k = bits[1];
        if (attr && k && dict[k] != null) el.setAttribute(attr.trim(), dict[k]);
      });
    });

    localStorage.setItem(STORAGE_KEY, lang);

    // reflect the choice in the dropdown: mark the active option and
    // show the current language code on the trigger button
    document.querySelectorAll(".lang-menu button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-lang") === lang);
    });
    document.querySelectorAll(".lang-code").forEach(function (el) {
      el.textContent = lang.toUpperCase();
    });
  }

  /* ---------- Init on DOM ready ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    applyLang(getLang());

    // language dropdown
    document.querySelectorAll(".lang-select").forEach(function (sel) {
      var trigger = sel.querySelector(".lang-current");
      function close() {
        sel.classList.remove("open");
        if (trigger) trigger.setAttribute("aria-expanded", "false");
      }
      if (trigger) {
        trigger.addEventListener("click", function (e) {
          e.stopPropagation();
          var isOpen = sel.classList.toggle("open");
          trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });
      }
      sel.querySelectorAll(".lang-menu button").forEach(function (b) {
        b.addEventListener("click", function () {
          applyLang(b.getAttribute("data-lang"));
          close();
        });
      });
      // dismiss on outside click or Escape
      document.addEventListener("click", function (e) {
        if (!sel.contains(e.target)) close();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") close();
      });
    });

    // theme toggle
    document.querySelectorAll(".theme-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
        applyTheme(current === "dark" ? "light" : "dark");
      });
    });

    // sticky header shadow
    var header = document.querySelector(".header");
    function onScroll() {
      if (!header) return;
      header.classList.toggle("scrolled", window.scrollY > 20);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // mobile menu
    var burger = document.querySelector(".hamburger");
    var links = document.querySelector(".nav-links");
    if (burger && links) {
      burger.addEventListener("click", function () {
        links.classList.toggle("open");
      });
      links.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () { links.classList.remove("open"); });
      });
    }

    // scroll reveal
    var reveals = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && reveals.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      }, { threshold: 0.12 });
      reveals.forEach(function (el) { io.observe(el); });
      // Safety net: environments that suspend IntersectionObserver
      // (throttled webviews, background panes) must still show content.
      setTimeout(function () {
        reveals.forEach(function (el) { el.classList.add("in"); });
      }, 2200);
    } else {
      reveals.forEach(function (el) { el.classList.add("in"); });
    }

    // footer year
    var yr = document.getElementById("year");
    if (yr) yr.textContent = new Date().getFullYear();

    // contact form (demo)
    var form = document.getElementById("contact-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var ok = document.getElementById("form-ok");
        if (ok) ok.style.display = "block";
        form.reset();
      });
    }
  });
})();
