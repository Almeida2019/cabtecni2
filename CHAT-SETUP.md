# Chat assistant setup

The widget is built and wired into all four pages, but it will not answer
anything until you deploy the proxy and paste its URL into the pages. Until
then it degrades politely: it tells the visitor to email or phone instead.

## Why a proxy at all

A Gemini API key cannot live in the website's JavaScript. The site is static,
so anything in the page source is visible to every visitor. A scraped key gets
used until your free quota is gone, or runs up a bill if billing is ever
enabled on the project.

So the key lives in one place only: a small serverless function on Vercel.
The browser talks to that function, the function talks to Gemini.

```
Browser  ->  your-project.vercel.app/api/chat  ->  Gemini API
                    (key lives here,
                     never sent to the browser)
```

The website itself stays on GitHub Pages exactly as it is. Only `api/chat.js`
goes to Vercel.

## Step 1: get a Gemini key

1. Go to https://aistudio.google.com/apikey
2. Create an API key (the free tier is enough for a brochure site)
3. Copy it, you will paste it into Vercel in step 3

Do not paste it into any file in this repo.

## Step 2: deploy to Vercel

From the project folder:

```bash
npm i -g vercel     # once, if you do not have it
vercel login
vercel --prod
```

Accept the defaults. Vercel detects `api/chat.js` automatically. When it
finishes it prints a URL like `https://cabtecni2-abc123.vercel.app`.

## Step 3: add the key in Vercel

In the Vercel dashboard, open the project, then **Settings → Environment
Variables**, and add:

| Name | Value |
|---|---|
| `GEMINI_API_KEY` | the key from step 1 |

Optional, only if you need them:

| Name | Purpose |
|---|---|
| `GEMINI_MODEL` | defaults to `gemini-2.0-flash`. Change if Google renames the free model. |
| `ALLOWED_ORIGINS` | comma separated. Defaults to the GitHub Pages URL plus localhost. Add your custom domain here when the site moves to one. |

Redeploy after adding variables (`vercel --prod`) so they take effect.

## Step 4: point the site at it

In all four HTML files, fill in the empty `data-endpoint`:

```html
<script src="assets/js/chat.js"
        data-endpoint="https://YOUR-PROJECT.vercel.app/api/chat"></script>
```

Quick way to do all four at once, replacing the URL with yours:

```bash
cd /Users/almeidajose/Documents/A/App/C/cabtecni
sed -i '' 's|data-endpoint=""|data-endpoint="https://YOUR-PROJECT.vercel.app/api/chat"|' *.html
git add -A && git commit -m "Point chat widget at the deployed proxy" && git push
```

## Step 5: check it works

Open the live site, click the chat bubble, and ask something like
"What services do you offer?". If it answers, you are done.

If it says it cannot answer right now, check the Vercel dashboard's function
logs. The usual causes are a missing `GEMINI_API_KEY`, a model name Google has
retired (set `GEMINI_MODEL`), or the site's origin not being in
`ALLOWED_ORIGINS`.

## What the assistant will and will not do

It is deliberately scoped to CABTECNI only, since it speaks under the company's
name on a client-facing site.

It knows the company background, the NAS Global relationship, all 7 sectors, all
8 services with their detail, and the contact information. It replies in the
visitor's currently selected site language, Portuguese, English, Spanish or
French.

It is instructed to refuse off-topic questions, never invent services, sectors,
certifications or client names, and never quote a price or commit to a delivery
date, pointing the visitor at sales@cabtecni.com for anything requiring a real
quote.

That last restriction is deliberate. An assistant that improvises a price or a
lead time under CABTECNI's logo creates a commercial problem, so it is told to
hand those to a human every time.

## Cost and limits

The Gemini free tier covers a brochure site comfortably. Guards already in the
function to protect the quota:

- only approved origins may call it, so nobody can point their own site at it
- each message is capped at 1000 characters
- only the last 12 turns of a conversation are sent
- responses are capped at 400 tokens
- temperature is 0.3, so answers stay factual rather than creative

If traffic ever grows enough to matter, the next step would be per-IP rate
limiting, which Vercel supports but which is not worth adding yet.
