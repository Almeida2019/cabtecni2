/* ============================================================
   CABTECNI — Site behaviour
   ============================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "cabtecni-lang";
  var DEFAULT_LANG = "pt";

  /* ---------- i18n ---------- */
  function getLang() {
    var saved = localStorage.getItem(STORAGE_KEY);
    return (saved === "pt" || saved === "en") ? saved : DEFAULT_LANG;
  }

  function applyLang(lang) {
    var dict = (typeof I18N !== "undefined" && I18N[lang]) ? I18N[lang] : {};
    document.documentElement.lang = (lang === "pt") ? "pt-AO" : "en";

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
    document.querySelectorAll(".lang-toggle button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-lang") === lang);
    });
  }

  /* ---------- Init on DOM ready ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    applyLang(getLang());

    // language toggle
    document.querySelectorAll(".lang-toggle button").forEach(function (b) {
      b.addEventListener("click", function () {
        applyLang(b.getAttribute("data-lang"));
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
