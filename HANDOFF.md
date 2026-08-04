# CABTECNI Website — Handoff (2026-07-30)

Start a new chat and say: **"Read HANDOFF.md in the cabtecni project and continue from there."**
That alone should be enough for a fresh session to pick this up correctly.

## What this is

A from-scratch static website rebuild for **CABTECNI** (Angolan oil & gas / industrial
services company), replacing their old WordPress site. Client contact: **António Maieco**.

- **Live site:** https://almeida2019.github.io/cabtecni2/
- **Repo:** git@github.com:Almeida2019/cabtecni2.git (branch `main`)
- **Local path:** `/Users/almeidajose/Documents/A/App/C/cabtecni`
- **Working tree is clean** and fully pushed as of this handoff (commit `87c850a`).

## Stack

Plain HTML/CSS/vanilla JS, no build step, no framework. 4 pages:
`index.html`, `about.html`, `services.html`, `contact.html`.

- `assets/css/styles.css` — everything, one file
- `assets/js/i18n.js` — all copy, 4 languages (pt/en/es/fr), 172 keys each, must stay in parity
- `assets/js/main.js` — theme toggle, language dropdown, mobile menu, reveal-on-scroll
- `assets/js/scroll-story.js` — the homepage hero's scroll-scrub engine (do not touch lightly)
- `assets/js/scroll-media.js` — generalized version of the same engine, used by every
  other cinematic section (data-attribute configured, see comments in the file)

## The signature feature: scroll-scrubbed cinematic sections

The homepage has **5 pinned full-bleed sections** that scrub through a sequence of
WebP frames (not video) as you scroll: Hero, About, Process, Values, CTA. Each has
its own `assets/frames-<name>/` (desktop) and `assets/frames-<name>-mobile/` (lighter,
for phones) directory of frames extracted from source video clips.

**Important architecture notes for whoever continues this:**
- Frames are lazy-loaded per section via IntersectionObserver, but the GSAP
  `ScrollTrigger.create()` (pin) for every section is set up **immediately** on page
  load regardless of whether frames have arrived, specifically so total page height
  doesn't jump as sections load in. Don't move pin creation into the "frames ready"
  callback again, that bug already happened once (see commit `2cdd1ed`).
- Hero source clips are only 1280x720 native, that is a real resolution ceiling,
  not a compression problem, see "Known limitations" below.
- Everything else was re-extracted at native 1920x1080 (desktop) / 1280x720 (mobile)
  after a "the frames look blurry" complaint, see commit `19a0e75`.
- Canvas `imageSmoothingQuality` must be set inside `sizeCanvas()`, not once at init,
  resizing a canvas silently resets context state. Already fixed, just don't undo it.

## Design system

- **Light mode is default**, dark is the toggle-able alternative (`data-theme` attr
  on `<html>`, persisted in localStorage). Anti-flash inline script in every page's
  `<head>` applies it before first paint.
- Colors/fonts derived from the client's actual brand kit (Poppins, blue #2683dc /
  green #61ce70 in dark mode, #007bff in light mode).
- Glassmorphism cards throughout (frosted, theme-aware via CSS custom properties).
- The cinematic sections (hero/about/process/values/cta) are **intentionally always
  dark** regardless of site theme, they're real photography with a vignette, not
  something that should "go light." Fixed-color tokens (`--oncolor-*`, `--story-*`)
  keep them that way; don't let them accidentally pick up theme-swappable tokens
  again (this caused an invisible-button bug twice, see commits `9e49a13`-adjacent
  history if it recurs).

## Content status

Copy was checked line-by-line against the live site (https://cabtecni.com/) for
accuracy, see commit `5f871a4`. Findings:
- Brand facts (100% Angolan, 5+ years, NAS Global HQ, contact details) all verified
  correct.
- **Service descriptions, Mission/Vision/Values, and the NAS Global partnership
  prominence are NEW content we wrote**, the old site had none of this. Flagged to
  the user as worth a client read-through before real launch, not yet confirmed
  approved by António.
- English grammar was audited and fixed (commit `16bfcbb`), all em dashes removed
  from every language per explicit user instruction (commit `ae78447`), the user
  dislikes them stylistically and considers them a tell of AI-written text. Do not
  reintroduce them in future copy edits.
- Hero headline is currently: "Engineering and procurement for energy, mining,
  construction and more" (equivalent phrasing in pt/es/fr). This was iterated
  several times, don't relitigate it without cause: it deliberately avoids
  naming one sector (would contradict the "7 sectors served" stat) and avoids a
  vague "industrial sector" filler. Last word is glued with a non-breaking space
  to prevent orphaning on wrap, this is load-bearing, don't strip it.

## Known limitations (told to the user, not yet resolved)

1. **Hero footage is only 1280x720 native.** The other 4 cinematic sections are now
   sharp at 1920x1080, but the hero will always look slightly softer on Retina
   displays unless the 4 source clips (`hero clip 1-4.mp4`, in the footage folder
   below) are regenerated at higher resolution and re-extracted.
2. **Total homepage weight**: ~14.6MB desktop / ~5.5MB mobile on first load (hero
   only, thanks to lazy-loading), but can reach ~62MB total if a visitor scrolls the
   entire page. This was flagged as a possible concern for mobile-heavy Angolan
   traffic; the user chose to keep the full cinematic experience over trimming it
   further. Options if revisited: fewer fps, or true `<video>` scrubbing instead of
   frames (would cut size ~3x but risks iOS Safari scrub smoothness).
3. Mobile touch targets and font sizes were audited and fixed once (commit `00a70dc`)
   but that was before the most recent content/hero changes, worth a fresh mobile
   pass if more copy changes land.

## Source assets (NOT in the repo, keep these safe)

The repo only has the processed/compressed web assets. Original sources live in
`~/Downloads/` and are **not backed up anywhere else**:

- `~/Downloads/Cabtecni video/` — all source MP4 clips (8 newer ones + 4 hero clips
  moved here during cleanup). Needed if any cinematic section is ever re-extracted.
- `~/Downloads/Cabtecni images/` — original ~165MB PNG masters behind the 14 bespoke
  interior-page photos (compressed to 3.8MB for web, originals kept in case a
  different crop/resize is ever needed).
- `~/Downloads/Cabtecnni logos/` — António's logo files (light/dark CABTECNI lockup)
  and the NAS GLOBAL partner logos, both light/dark variants. Note: the NAS Global
  files are misleadingly named, "light background" file actually contains the white
  artwork and vice versa. Already wired up correctly by content, not by filename,
  just don't get confused if revisiting.

**Recommend backing these three folders up somewhere durable** (they're the only
copies of a lot of paid/generated work).

## Environment quirks worth knowing

- **Preview pane in this tool freezes/shows stale paint after any JS-driven or
  wheel-driven scroll**, this happened constantly during development. The fix is
  always to verify via computed styles / DOM state / `getBoundingClientRect()`
  rather than trusting a screenshot taken right after a scroll. This is a tooling
  limitation, not a site bug, confirmed dozens of times by cross-checking.
- A fresh preview tab sometimes reports `window.innerWidth === 0` immediately after
  `navigate()`, this resolves after a `computer` screenshot call or a
  `resize_window` call. Not a real viewport bug either.
- To restart the local preview server: use `preview_start` with `name:
  "cabtecni-static"` (config already exists in `.claude/launch.json`, points at a
  scratchpad copy of the site on port 4599). The scratchpad copy needs re-syncing
  from the real project directory after any edit, since it's a separate physical
  copy, not a symlink.

## The user's next stated intent (as of this handoff)

They said they have **another folder for an "alternative website"** they want
prepared for a presentation, comparison purposes were implied but not fully
specified before context ran out. Ask them directly what that folder contains and
what they want done with it (a comparison? a second reference design? a second
client site entirely?) rather than assuming.
