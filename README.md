# Amber Lynn Photography

A photography portfolio built with [Astro](https://astro.build), deployed as a static site on Cloudflare Pages. Design notes live in `DESIGN.md`.

## Making content changes

You don't need to touch code. Open this folder in **Claude Code** and say what you want in plain English — "add the photos in ~/Desktop/rivera-photos as a new wedding shoot," "change the tagline," "feature the Ortiz session." The instructions Claude follows are in `CLAUDE.md`.

## Local development

Requires Node 22+ (the version is pinned in `.node-version`).

```
npm install
npm run dev      # preview at http://localhost:4321
npm run build    # production build into dist/
```

## One-time Cloudflare Pages setup

1. Push this repository to GitHub (or GitLab).
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, and pick the repository.
3. Build settings:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: picked up automatically from `.node-version` (22)
4. Save and deploy. From now on, every push to `main` deploys automatically; a failed build never touches the live site.

## Custom domain

In the Pages project: **Custom domains → Set up a custom domain**, enter the domain, and follow the prompts. If the domain's DNS is already on Cloudflare this is one click; otherwise Cloudflare shows the DNS records to add at your registrar.

## Contact form

The contact form posts to Formspree. Create a free form at [formspree.io](https://formspree.io) and put its 8-character id in `src/content/site/settings.md` under `formspreeId` (Claude Code can do this — just give it the id).
