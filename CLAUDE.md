# CLAUDE.md — Operations Manual

This is Amber Lynn's photography portfolio: an Astro static site deployed on Cloudflare Pages. The design and code are **finished and frozen** — day-to-day work is content only. Content lives under `src/content/**` (shoots, categories, site settings) and is validated by the schemas in `src/content.config.ts`; everything else is code. The owner is a non-technical photographer — do the work for her, explain in plain language, and never ask her to edit code.

## THE HARD RULE

**Never edit anything under `src/components/`, `src/pages/`, `src/layouts/`, `src/styles/`, `src/lib/`, or root config files** (`astro.config.mjs`, `package.json`, `tsconfig.json`, `src/content.config.ts`). No exceptions, even if a change "would be easy." Content lives ONLY under `src/content/` (plus favicon assets in `public/`). If a request truly requires code changes, say so and stop — don't attempt it.

## Operation 1: Add a shoot

Run the ingest script (it resizes to 2400px, converts to WebP, and strips EXIF/GPS metadata — important because client photos are taken at their homes):

```
npm run ingest ~/Desktop/rivera-photos weddings rivera-wedding
```

Arguments: source folder, existing category id, new shoot slug. It creates `src/content/shoots/rivera-wedding/` with `01.webp, 02.webp, ...` and a stub `index.mdx` full of `EDIT ME` placeholders. Then edit that `index.mdx` — ask the owner for the shoot date, a sentence or two about the session, and what's in each photo. A finished file looks like:

```mdx
---
title: Rivera Wedding
category: weddings
date: 2026-06-20
cover: ./03.webp
images:
  - src: ./01.webp
    alt: The bride laughing during her father's toast, string lights behind her.
  - src: ./02.webp
    alt: Rings resting on a handwritten vow book.
  - src: ./03.webp
    alt: The couple's first dance under a canvas tent at dusk.
layout_hint: masonry
featured: true
---

A June evening at the Rivera family orchard. Half the guests cried during
the vows, and the other half caught up during the dancing.
```

- `alt` — a real one-line description per photo. Never leave `EDIT ME` in a published shoot.
- `layout_hint` — `masonry` (default, mixed grid — right for most shoots), `editorial` (larger, magazine-style pacing — for small curated sets), `full` (each image full width — only when every image deserves the whole screen).
- `featured: true` puts this shoot's images into the gallery highlights and landing page (see Operation 4).

## Operation 2: Add / reorder / edit a category

Categories are single files in `src/content/categories/`. Creating `src/content/categories/families.md` automatically creates a page at `/gallery/families`:

```md
---
displayName: Families
order: 2
blurb: Backyard chaos, quiet moments, and everyone actually looking like themselves.
featuredCount: 8
---
```

- `order` — integer; categories appear in ascending order everywhere (gallery, nav index). To reorder, renumber the `order` values.
- `blurb` — one warm sentence shown under the category heading (match the site's plain, first-person voice).
- `featuredCount` — how many featured images this category shows on the gallery page (defaults to 8 if omitted).

A category needs at least one shoot with `featured: true` to have anything to show — add or feature shoots after creating it.

## Operation 3: Change site settings

Everything global lives in `src/content/site/settings.md`. Full file with every key:

```md
---
photographerName: Amber Lynn          # her name, used in titles/footer
wordmark: Amber Lynn                  # the nav wordmark text
tagline: I photograph people who'd rather forget the camera is there.   # hero line
location: Grand Junction, Colorado    # shown in footer/contact
email: hello@amberlynnphoto.com       # contact fallback link
instagram: "@amberlynn.photo"         # keep quotes — the @ needs them
formspreeId: YOUR_FORM_ID             # see below
pricingLine: Sessions from $150 — inquire for details.   # italic line on contact page
heroImage: ./hero.webp                # landing hero — file must sit in src/content/site/
heroAlt: A couple stands close together in warm evening light, photographed candidly from a distance.
---
```

- **formspreeId** — the contact form won't deliver until this is real. Create a free form at [formspree.io](https://formspree.io), copy the 8-character id from the form's endpoint (`https://formspree.io/f/<THIS PART>`), paste it here.
- **heroImage** — to change the hero, copy the new image into `src/content/site/` and point `heroImage` at it (e.g. `./hero-2026.webp`). Keep it large (2400px+ wide) and landscape. Update `heroAlt` to describe the new photo.
- **Placeholder name/tagline** — if `photographerName`/`wordmark`/`tagline` still hold placeholder text, replace them here; they flow through the whole site.

## Operation 4: Feature / unfeature work

Flip `featured: true` or `featured: false` in a shoot's `src/content/shoots/<slug>/index.mdx`. Featured shoots' images power two things: each category's section on the gallery page (up to that category's `featuredCount` images) and the featured strip on the landing page. Every category should have enough featured images to fill its `featuredCount` — if a section looks thin, feature another shoot in that category.

## Publishing

```
git add -A && git commit -m "add rivera wedding shoot" && git push origin main
```

Pushing to `main` triggers a Cloudflare Pages build automatically (~1–2 min). **If the build fails, the live site is untouched** — nothing breaks in public. Read the build log in the Cloudflare Pages dashboard (or run `npm run build` locally): the error names the exact file and the bad frontmatter key. Fix the file, commit, push again.

## Verify locally

```
npm run dev
```

Then open http://localhost:4321. Always eyeball changes here before pushing.

## Things that will break the build

- An unknown frontmatter key (schemas are strict — even a typo like `titel:` fails).
- A `category:` value with no matching file in `src/content/categories/`.
- A `cover:`/`src:`/`heroImage:` path pointing at a file that doesn't exist.
- A `layout_hint` other than `masonry`, `editorial`, or `full`.

All of these fail with a readable error naming the file. Fix and push again — the live site waits safely on the last good build.
