/* ============================================================
   CABTECNI — Chat assistant widget

   Talks to the Vercel function in /api/chat.js, which holds the
   Gemini key. Nothing secret lives here.

   Wire it up with:
     <script src="assets/js/chat.js"
             data-endpoint="https://YOUR-PROJECT.vercel.app/api/chat"></script>

   Markup is built here rather than duplicated across four pages.
   ============================================================ */
(function () {
  "use strict";

  var script = document.currentScript;
  var ENDPOINT = (script && script.dataset.endpoint) || "";

  var LANG_KEY = "cabtecni-lang";
  var MAX_CHARS = 1000;

  function t(key, fallback) {
    var lang = getLang();
    if (typeof I18N !== "undefined" && I18N[lang] && I18N[lang][key] != null) {
      return I18N[lang][key];
    }
    return fallback;
  }

  function getLang() {
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (["pt", "en", "es", "fr"].indexOf(saved) > -1) return saved;
    } catch (e) {}
    return "pt";
  }

  /* ---------- build the UI ---------- */
  var root, panel, log, input, sendBtn, launcher;
  var history = [];      // [{role:'user'|'assistant', text}]
  var busy = false;
  var greeted = false;

  function build() {
    root = document.createElement("div");
    root.className = "chat-widget";
    root.innerHTML =
      '<button class="chat-launcher" type="button" aria-expanded="false">' +
        '<svg class="chat-icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' +
        '</svg>' +
        '<svg class="chat-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M18 6 6 18M6 6l12 12"/>' +
        '</svg>' +
      '</button>' +
      '<section class="chat-panel" role="dialog" aria-modal="false" hidden>' +
        '<header class="chat-head">' +
          '<span class="chat-dot" aria-hidden="true"></span>' +
          '<span class="chat-title"></span>' +
          '<button class="chat-close" type="button">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
          '</button>' +
        '</header>' +
        '<div class="chat-log" role="log" aria-live="polite"></div>' +
        '<form class="chat-form">' +
          '<textarea class="chat-input" rows="1" maxlength="' + MAX_CHARS + '"></textarea>' +
          '<button class="chat-send" type="submit">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>' +
          '</button>' +
        '</form>' +
      '</section>';

    document.body.appendChild(root);

    launcher = root.querySelector(".chat-launcher");
    panel    = root.querySelector(".chat-panel");
    log      = root.querySelector(".chat-log");
    input    = root.querySelector(".chat-input");
    sendBtn  = root.querySelector(".chat-send");

    applyLabels();

    launcher.addEventListener("click", toggle);
    root.querySelector(".chat-close").addEventListener("click", close);
    root.querySelector(".chat-form").addEventListener("submit", onSubmit);

    // Enter sends, Shift+Enter makes a new line.
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(e); }
    });
    input.addEventListener("input", autoGrow);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && root.classList.contains("open")) close();
    });
  }

  function applyLabels() {
    root.querySelector(".chat-title").textContent = t("chat.title", "Assistente CABTECNI");
    launcher.setAttribute("aria-label", t("chat.open", "Abrir assistente"));
    root.querySelector(".chat-close").setAttribute("aria-label", t("chat.close", "Fechar"));
    input.setAttribute("placeholder", t("chat.placeholder", "Escreva a sua pergunta..."));
    sendBtn.setAttribute("aria-label", t("chat.send", "Enviar"));
    panel.setAttribute("aria-label", t("chat.title", "Assistente CABTECNI"));
  }

  function autoGrow() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 110) + "px";
  }

  /* ---------- open / close ---------- */
  function toggle() { root.classList.contains("open") ? close() : open(); }

  function open() {
    root.classList.add("open");
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    if (!greeted) { greet(); greeted = true; }
    setTimeout(function () { input.focus(); }, 260);
  }

  function close() {
    root.classList.remove("open");
    launcher.setAttribute("aria-expanded", "false");
    setTimeout(function () { if (!root.classList.contains("open")) panel.hidden = true; }, 260);
  }

  function greet() {
    addMessage("assistant", t("chat.greeting",
      "Olá. Posso ajudar com informação sobre os serviços da CABTECNI. O que precisa de saber?"), true);
  }

  /* ---------- messages ---------- */
  function addMessage(role, text, skipHistory) {
    var el = document.createElement("div");
    el.className = "chat-msg chat-msg--" + role;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    if (!skipHistory) history.push({ role: role, text: text });
    return el;
  }

  function showTyping() {
    var el = document.createElement("div");
    el.className = "chat-msg chat-msg--assistant chat-typing";
    el.innerHTML = "<span></span><span></span><span></span>";
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function onSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (busy) return;

    var text = (input.value || "").trim();
    if (!text) return;

    if (!ENDPOINT) {
      addMessage("user", text);
      input.value = ""; autoGrow();
      addMessage("assistant", t("chat.notconfigured",
        "O assistente ainda não está configurado. Contacte-nos em sales@cabtecni.com."), true);
      return;
    }

    addMessage("user", text);
    input.value = ""; autoGrow();
    send();
  }

  function send() {
    busy = true;
    sendBtn.disabled = true;
    var typing = showTyping();

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: getLang(), messages: history })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        typing.remove();
        if (res.ok && res.data && res.data.reply) {
          addMessage("assistant", res.data.reply);
        } else {
          addMessage("assistant", t("chat.error",
            "Desculpe, não consegui responder agora. Tente novamente ou escreva para sales@cabtecni.com."), true);
        }
      })
      .catch(function () {
        typing.remove();
        addMessage("assistant", t("chat.error",
          "Desculpe, não consegui responder agora. Tente novamente ou escreva para sales@cabtecni.com."), true);
      })
      .finally(function () {
        busy = false;
        sendBtn.disabled = false;
        input.focus();
      });
  }

  /* ---------- init ---------- */
  function init() {
    build();
    // Keep the widget's own labels in step with the site language switcher.
    document.querySelectorAll(".lang-menu button").forEach(function (b) {
      b.addEventListener("click", function () { setTimeout(applyLabels, 50); });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
