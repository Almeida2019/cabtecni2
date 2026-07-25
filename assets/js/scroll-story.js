/* ============================================================
   CABTECNI — Scroll-scrubbed cinematic sequence (home only)
   Canvas frame sequence driven by GSAP ScrollTrigger, on both
   desktop and mobile — mobile loads a smaller/lighter frame set
   (640x360, ~5.5MB vs 15MB) so preloading stays reasonable on
   mobile networks. Reduced-motion users get a plain autoplaying
   muted video instead, since motion can be disorienting for them.
   ============================================================ */
(function () {
  "use strict";

  var section = document.getElementById("story");
  if (!section) return;

  var FRAME_COUNT = 306;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia("(max-width: 880px)").matches;
  var FRAME_DIR = isMobile ? "assets/frames-mobile" : "assets/frames";
  var FRAME_PATH = function (i) {
    return FRAME_DIR + "/frame_" + String(i + 1).padStart(4, "0") + ".webp";
  };
  /* Frame ranges per clip, in the order they were shot into the sequence:
     ship arriving -> refinery -> offshore platform -> technician detail */
  var SEGMENTS = [
    { from: 0,   to: 72  },
    { from: 72,  to: 144 },
    { from: 144, to: 216 },
    { from: 216, to: 306 }
  ];
  var SEGMENT_SECONDS = [0, 8, 16, 24, 34.006]; // matches source clip durations
  var HERO_END = 0.1; // first 10% of the scroll is the hero; then chapters take over

  var captions = section.querySelectorAll("[data-story-caption]");
  var railItems = section.querySelectorAll("[data-story-dot]");
  var activeCaption = -1;
  function setActiveCaption(idx) {
    if (idx === activeCaption) return;
    activeCaption = idx;
    captions.forEach(function (el, i) {
      el.classList.toggle("is-active", i === idx);
    });
    railItems.forEach(function (el, i) {
      el.classList.toggle("is-active", i === idx);
    });
  }

  if (reduceMotion) {
    initVideoFallback();
  } else {
    initCanvasScrub();
  }

  function initVideoFallback() {
    section.classList.add("story--video");
    var video = section.querySelector("#story-video-fallback");
    var canvas = section.querySelector("#story-canvas");
    var loading = section.querySelector("#story-loading");
    if (canvas) canvas.style.display = "none";
    if (loading) loading.classList.add("is-hidden");
    if (!video) return;

    video.src = "assets/vid/story-reel.mp4";
    video.load();
    var playPromise = video.play();
    if (playPromise && playPromise.catch) playPromise.catch(function () {});

    // Reduced-motion users keep the hero copy over the looping video; the
    // chapter cards/rail (scroll-driven) stay hidden via the .is-hero state.
    section.classList.add("is-hero");
  }

  function initCanvasScrub() {
    var canvas = section.querySelector("#story-canvas");
    var ctx = canvas.getContext("2d");
    var loading = section.querySelector("#story-loading");
    var loadingFill = section.querySelector("#story-loading-fill");
    var progressBar = section.querySelector(".story-progress-bar");

    // The <video> fallback is unused on this path — without a src it still
    // paints its poster frame, which would sit on top of the canvas and
    // mask every frame update since it shares the same stacking position.
    var unusedVideo = section.querySelector("#story-video-fallback");
    if (unusedVideo) unusedVideo.style.display = "none";

    var images = new Array(FRAME_COUNT);
    var loadedCount = 0;
    // Retina canvases quadruple pixel-fill cost; cap at 1x on phones to
    // keep the scrub smooth on mid-range hardware.
    var dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    var currentFrame = 0;

    function sizeCanvas() {
      var rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    }

    function drawFrame(i) {
      var img = images[i];
      if (!img || !img.complete || !img.naturalWidth) return;
      currentFrame = i;
      var cw = canvas.width, ch = canvas.height;
      var ratio = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      var w = img.naturalWidth * ratio, h = img.naturalHeight * ratio;
      var x = (cw - w) / 2, y = (ch - h) / 2;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, x, y, w, h);
    }

    function updateCaptionForFrame(i) {
      for (var s = 0; s < SEGMENTS.length; s++) {
        if (i >= SEGMENTS[s].from && i < SEGMENTS[s].to) { setActiveCaption(s); return; }
      }
      setActiveCaption(SEGMENTS.length - 1);
    }

    function preload() {
      for (var i = 0; i < FRAME_COUNT; i++) {
        (function (idx) {
          var img = new Image();
          img.onload = img.onerror = function () {
            loadedCount++;
            var pct = Math.round((loadedCount / FRAME_COUNT) * 100);
            if (loadingFill) loadingFill.style.width = pct + "%";
            if (idx === 0) { sizeCanvas(); drawFrame(0); }
            if (loadedCount === FRAME_COUNT) onReady();
          };
          img.src = FRAME_PATH(idx);
          images[idx] = img;
        })(i);
      }
    }

    function onReady() {
      if (loading) loading.classList.add("is-hidden");
    }

    function setupScrollTrigger() {
      if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
        // Library failed to load (offline/CDN blocked) — fall back to a static frame.
        drawFrame(0);
        return;
      }
      gsap.registerPlugin(ScrollTrigger);

      // A shorter scroll distance per frame on mobile keeps the sequence
      // from demanding an excessive amount of thumb-scrolling.
      var pxPerFrame = isMobile ? 9 : 13;
      var scrollLength = Math.round(FRAME_COUNT * pxPerFrame);

      var st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=" + scrollLength,
        pin: true,
        anticipatePin: 1,
        scrub: isMobile ? 0.35 : 0.6,
        onUpdate: function (self) {
          var p = self.progress;
          var frame = Math.round(p * (FRAME_COUNT - 1));
          if (frame !== currentFrame) drawFrame(frame);

          // Hero copy owns the first slice of the scroll; then hand off to chapters.
          var heroMode = p < HERO_END;
          section.classList.toggle("is-hero", heroMode);
          if (!heroMode) updateCaptionForFrame(frame);

          if (progressBar) progressBar.style.transform = "scaleX(" + p + ")";
        }
      });

      // Click a chapter to scroll to the middle of that segment (past the hero).
      railItems.forEach(function (item, i) {
        item.addEventListener("click", function () {
          var seg = SEGMENTS[i];
          var mid = (seg.from + seg.to) / 2;
          var frac = Math.max(HERO_END + 0.02, mid / (FRAME_COUNT - 1));
          var target = st.start + frac * (st.end - st.start);
          window.scrollTo({ top: target, behavior: "smooth" });
        });
      });
    }

    window.addEventListener("resize", function () {
      sizeCanvas();
      drawFrame(currentFrame);
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });

    sizeCanvas();
    /* Establish the pin (and therefore the page's full height) before the
       frames download. Creating it in onReady() instead meant the page was
       ~4000px shorter until the hero finished loading, which both risked a
       layout jump and made every lazy-loaded section below think it was
       near the viewport, defeating their deferred loading. */
    setupScrollTrigger();
    preload();
  }
})();
