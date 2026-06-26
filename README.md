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

## Glossary

IC = Inheritance Certificate · SYC = Syariah Court ·
LOA = Letters of Administration · CPF = Central Provident Fund ·
MUIS = Islamic Religious Council of Singapore · Faraid = Islamic inheritance law
