/* ============================================================
   CABTECNI — Reusable scroll-scrubbed cinematic sections
   Generalizes the homepage hero's canvas frame-sequence technique
   (see scroll-story.js) for additional full-bleed sections: About,
   Values, CTA. Configured entirely via data-* attributes on any
   element carrying the .story-scrub class, so new sections can be
   added without new JS.

   Expected markup per section (class="story story-scrub"):
     data-frames            frame directory (desktop)
     data-frames-mobile     frame directory (mobile, lighter set)
     data-frame-count       total frame count
     data-video-fallback    mp4 used for prefers-reduced-motion
     data-px-per-frame      optional scroll distance per frame
     data-segments          optional JSON [[from,to], ...] for
                             multi-chapter sections (e.g. Values);
                             omit for a single persistent caption
   Reuses the same .story-canvas/.story-video/.story-loading/
   .story-overlay/[data-story-caption]/[data-story-dot] structure
   and CSS as the hero, so the two look and feel identical.
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia("(max-width: 880px)").matches;

  document.querySelectorAll(".story-scrub").forEach(initSection);

  function initSection(section) {
    var frameCount = parseInt(section.dataset.frameCount, 10);
    var frameDir = (isMobile && section.dataset.framesMobile) ? section.dataset.framesMobile : section.dataset.frames;
    var videoFallback = section.dataset.videoFallback;
    var pxPerFrame = parseFloat(section.dataset.pxPerFrame || (isMobile ? 9 : 13));
    var segments = null;
    if (section.dataset.segments) {
      try { segments = JSON.parse(section.dataset.segments); } catch (e) { segments = null; }
    }

    var captions = section.querySelectorAll("[data-story-caption]");
    var railItems = section.querySelectorAll("[data-story-dot]");
    var activeCaption = -1;
    function setActiveCaption(idx) {
      if (idx === activeCaption) return;
      activeCaption = idx;
      captions.forEach(function (el, i) { el.classList.toggle("is-active", i === idx); });
      railItems.forEach(function (el, i) { el.classList.toggle("is-active", i === idx); });
    }

    var multiChapter = !!(segments && captions.length > 1);
    if (!multiChapter) setActiveCaption(0); // single caption: always shown

    if (reduceMotion) {
      initVideoFallback();
    } else {
      initCanvasScrub();
    }

    function initVideoFallback() {
      section.classList.add("story--video");
      var video = section.querySelector(".story-video");
      var canvas = section.querySelector(".story-canvas");
      var loading = section.querySelector(".story-loading");
      if (canvas) canvas.style.display = "none";
      if (loading) loading.classList.add("is-hidden");
      if (!video || !videoFallback) return;

      video.src = videoFallback;
      video.load();
      var p = video.play();
      if (p && p.catch) p.catch(function () {});

      if (multiChapter) {
        video.addEventListener("loadedmetadata", function () {
          var dur = video.duration || 0;
          video.addEventListener("timeupdate", function () {
            if (!dur) return;
            var frac = video.currentTime / dur;
            var idx = Math.min(segments.length - 1, Math.floor(frac * segments.length));
            setActiveCaption(idx);
          });
        });
      }
    }

    function initCanvasScrub() {
      var canvas = section.querySelector(".story-canvas");
      var ctx = canvas.getContext("2d");
      var loading = section.querySelector(".story-loading");
      var loadingFill = section.querySelector(".story-loading-fill");
      var progressBar = section.querySelector(".story-progress-bar");

      var unusedVideo = section.querySelector(".story-video");
      if (unusedVideo) unusedVideo.style.display = "none";

      var images = new Array(frameCount);
      var loadedCount = 0;
      var dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      var currentFrame = 0;

      function framePath(idx) {
        return frameDir + "/frame_" + String(idx + 1).padStart(4, "0") + ".webp";
      }

      function sizeCanvas() {
        var rect = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.round(rect.width * dpr));
        canvas.height = Math.max(1, Math.round(rect.height * dpr));
        // Resizing a canvas resets its context state, so smoothing must be
        // re-applied here. Frames are scaled to cover the viewport and the
        // default "low" quality makes that visibly soft; "high" costs nothing.
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
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
        if (!multiChapter) return;
        for (var s = 0; s < segments.length; s++) {
          if (i >= segments[s][0] && i < segments[s][1]) { setActiveCaption(s); return; }
        }
        setActiveCaption(segments.length - 1);
      }

      function preload() {
        for (var i = 0; i < frameCount; i++) {
          (function (idx) {
            var img = new Image();
            img.onload = img.onerror = function () {
              loadedCount++;
              var pct = Math.round((loadedCount / frameCount) * 100);
              if (loadingFill) loadingFill.style.width = pct + "%";
              if (idx === 0) { sizeCanvas(); drawFrame(0); }
              if (loadedCount === frameCount) onReady();
            };
            img.src = framePath(idx);
            images[idx] = img;
          })(i);
        }
      }

      function onReady() {
        if (loading) loading.classList.add("is-hidden");
      }

      function setupScrollTrigger() {
        if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
          drawFrame(0);
          return;
        }
        gsap.registerPlugin(ScrollTrigger);
        var scrollLength = Math.round(frameCount * pxPerFrame);

        var st = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "+=" + scrollLength,
          pin: true,
          anticipatePin: 1,
          scrub: isMobile ? 0.35 : 0.6,
          onUpdate: function (self) {
            var p = self.progress;
            var frame = Math.round(p * (frameCount - 1));
            if (frame !== currentFrame) drawFrame(frame);
            updateCaptionForFrame(frame);
            if (progressBar) progressBar.style.transform = "scaleX(" + p + ")";
          }
        });

        railItems.forEach(function (item, i) {
          item.addEventListener("click", function () {
            var seg = segments[i];
            var mid = (seg[0] + seg[1]) / 2;
            var frac = mid / (frameCount - 1);
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

      /* Pin/layout is established up front so total page height is stable.
         If ScrollTrigger were created only after the frames arrived, each
         section would inject its pin spacing late and shove the page down
         mid-scroll. */
      setupScrollTrigger();

      /* Only the frame download is deferred, until the visitor is actually
         approaching this section. Previously every section preloaded on
         page load, so someone who never scrolled past the hero still paid
         for all of them. rootMargin starts the fetch ~2 screens early so
         frames are ready before the section is reached; drawFrame() already
         no-ops on frames that haven't arrived. */
      if ("IntersectionObserver" in window) {
        var started = false;
        var io = new IntersectionObserver(function (entries) {
          if (started || !entries.some(function (e) { return e.isIntersecting; })) return;
          started = true;
          io.disconnect();
          preload();
        }, { rootMargin: "200% 0px" });
        io.observe(section);
      } else {
        preload();
      }
    }
  }
})();
