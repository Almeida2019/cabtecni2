# CABTECNI — Website

A modern, dark corporate/industrial static website for **CABTECNI, Lda**, modeled on the
AIPI-Offshore layout. **Bilingual (Portuguese primary + English toggle).** No build step,
no framework — plain HTML/CSS/JS.

## Structure

```
index.html          Home
about.html          Quem Somos / About Us
services.html       Serviços / Services (all 8 services, detailed)
contact.html        Contactos / Contact (details + form)
assets/
  css/styles.css    Design system + all styles
  js/i18n.js        PT/EN dictionary (all text lives here)
  js/main.js        Language toggle, nav, scroll reveal, form
serve.py            Tiny local dev server (optional)
```

## Run locally

Any static server works. For example:

```bash
python3 serve.py         # serves on http://127.0.0.1:4599
# or
python3 -m http.server 8000
```

Then open the printed URL. (Opening the HTML files directly with `file://` also works,
but a server is recommended so the language preference persists cleanly.)

## Editing content

**All visible text is in `assets/js/i18n.js`** as two dictionaries: `pt` and `en`.
Each element in the HTML references a key via `data-i18n="key"`. To change wording,
edit the value in *both* languages. Keep the two dictionaries in sync (same keys).

- `data-i18n` → replaces text
- `data-i18n-html` → replaces rich HTML (used for the service bullet lists)
- `data-i18n-attr` → replaces an attribute (used for form placeholders)

Default language is Portuguese; the choice is remembered in the browser (localStorage).

## To do before going live

1. **Add real images.** The gradient boxes marked "placeholder" are where photos go
   (hero background, About/team photo, NAS Global, one image per service). Drop files
   into `assets/img/` and swap the `.media` / `.svc-media` blocks for `<img>` tags.
2. **Add the real logo.** Currently a styled "C" monogram. Replace the `.brand .mark`
   with your logo image if preferred.
3. **Activate the contact form.** It's a front-end demo only. Point it at a form
   backend (e.g. Formspree, or your own endpoint) by setting the `<form>` `action`
   and `method`, then remove the demo handler in `main.js`.
4. **Add an embedded map** on the Contact page (Google Maps iframe) if wanted.
5. **Verify service capability bullets** in `i18n.js` against your actual
   certifications, standards (ASME/API/ISO), equipment and capacities — some are
   generic placeholders. See `cabtecni-service-descriptions.md`.
6. **Link the real LinkedIn URL** (currently `#` in the footer/social icons).

## Source material

- `cabtecni-content-inventory.md` — everything scraped from the old cabtecni.com
- `cabtecni-service-descriptions.md` — the long-form service copy (English source)
