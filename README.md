# Muslim Estate Administration Guide — Access to Justice Prototype

A guided, plain-language pathfinder that walks a family through Singapore's
Muslim estate administration process (Faraid, Inheritance Certificate, and
Letters of Administration). It asks 11 key decision-point questions one at a
time and then produces a tailored summary and recommended next steps.

> **Disclaimer:** This is a prototype for testing only. It provides general
> guidance, not legal advice.

## How it works

The app is a **single self-contained static page** — all logic (including the
generated summary) runs in the browser. No backend or build step is required.

- `index.html` — the entire app (markup, styles, and logic)
- `assets/background.jpg` — optimized background photo
- `server.js` — optional tiny local web server for testing

## Run locally

Either open `index.html` directly in a browser, or serve it:

```bash
node server.js
# then visit http://localhost:8000
```

## Deploy

Because it is fully static, it can be hosted free on any static host:

- **Netlify** — drag-and-drop the folder, or connect this repo for auto-deploy
- **GitHub Pages** — Settings → Pages → deploy from the `main` branch (root)
- **Cloudflare Pages** — connect the repo

## Assistant chatbot

The landing page includes an assistant panel. It runs in two modes:

- **Grounded (live):** the serverless function `api/chat.js` sends questions to a
  Claude model with a system prompt that embeds the vetted knowledge base
  (`assets/knowledge-base.md`, bundled via `api/knowledge.js`) and instructs it
  to answer **only** from that material. Enable it by setting environment
  variables on the serverless host (e.g. Vercel → Project → Settings →
  Environment Variables):
  - `ANTHROPIC_API_KEY` — required. Your Anthropic API key.
  - `CHAT_MODEL` — optional. Defaults to `claude-haiku-4-5` (most cost-effective);
    set to `claude-sonnet-5` or `claude-opus-5` for higher quality.
- **Static fallback:** if no key is configured (or the site is served by a
  static-only host), the panel falls back to a scope-locked scripted assistant so
  the chat always works. Nothing breaks before the key is added.

To update what the grounded chatbot may say, edit `assets/knowledge-base.md`, then
regenerate the bundled copy:

```bash
python3 -c "import json;open('api/knowledge.js','w').write('module.exports = '+json.dumps(open('assets/knowledge-base.md').read())+';\n')"
```

The API key is only ever read server-side from the environment — it is never
included in the public page.

## Glossary

IC = Inheritance Certificate · SYC = Syariah Court ·
LOA = Letters of Administration · CPF = Central Provident Fund ·
MUIS = Islamic Religious Council of Singapore · Faraid = Islamic inheritance law
