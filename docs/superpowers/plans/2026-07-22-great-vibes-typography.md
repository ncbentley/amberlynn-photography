# Great Vibes Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply Great Vibes to display typography, retain Young Serif for homepage category titles and subtitles, and retain Karla for body and interface copy.

**Architecture:** Use the regular Great Vibes Fontsource package for `--font-display` and retain Young Serif through a separate `--font-homepage-display` token. Homepage category titles and subtitles explicitly use the homepage token; body and interface text continue to inherit Karla.

**Tech Stack:** Astro 7, CSS custom properties, Fontsource, npm

## Global Constraints

- Bundle Great Vibes locally with no runtime font CDN request.
- Bundle Young Serif locally for homepage category titles and subtitles.
- Keep only the homepage category titles and subtitles in Young Serif.
- Keep branding such as the Amberlynn wordmark in Great Vibes, including on the homepage.
- Keep Karla on paragraphs, navigation links, controls, captions, metadata, and small labels.
- Do not alter content, imagery, colors, layout, or unrelated typography.
- Preserve cursive and serif fallbacks.

---

### Task 1: Replace the Display Font Package

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/layouts/Base.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: existing `--font-display` CSS custom property
- Produces: locally bundled Great Vibes exposed through `var(--font-display)`

- [ ] **Step 1: Record pre-change assertions**

Run `rg -n "@fontsource/young-serif|'Young Serif'|@fontsource/great-vibes|'Great Vibes'" package.json package-lock.json src/layouts/Base.astro src/styles/global.css`.

Expected: Young Serif appears in the dependency, lockfile, import, and display token; Great Vibes does not.

- [ ] **Step 2: Replace the package**

Run `npm uninstall @fontsource/young-serif` and then `npm install @fontsource/great-vibes`.

Expected: the manifest and lockfile contain Great Vibes and no Young Serif.

- [ ] **Step 3: Replace the layout import**

In `src/layouts/Base.astro`, replace the Young Serif import with:

```astro
import '@fontsource/great-vibes';
```

- [ ] **Step 4: Replace the display token**

In `src/styles/global.css`, use:

```css
--font-display: 'Great Vibes', cursive, Georgia, serif;
```

- [ ] **Step 5: Verify replacement assertions**

Repeat the Step 1 `rg` command.

Expected: Great Vibes appears in the dependency, lockfile, import, and token; Young Serif is absent.

### Task 2: Apply Display Typography to Prominent Subtitles

**Files:**
- Modify: `src/components/Hero.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `var(--font-display)` from `src/styles/global.css`
- Produces: Great Vibes on the hero tagline, category subtitle, and homepage CTA line

- [ ] **Step 1: Record pre-change selectors**

Run `rg -n -A12 "^  \.tagline|^  \.cat-blurb|^  \.cta-line" src/components/Hero.astro src/pages/index.astro`.

Expected: these selectors do not declare the display font.

- [ ] **Step 2: Style the hero tagline**

Add to `.tagline` in `src/components/Hero.astro`:

```css
font-family: var(--font-display);
```

- [ ] **Step 3: Style homepage subtitles**

Add the same declaration to `.cat-blurb` and `.cta-line` in `src/pages/index.astro`.

- [ ] **Step 4: Confirm interface typography is untouched**

Run `git diff -- src/components/Hero.astro src/pages/index.astro src/styles/global.css src/layouts/Base.astro`.

Expected: navigation, forms, paragraphs, captions, metadata, and small-label rules remain unchanged.

### Task 3: Restore the Original Homepage Display Font

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/layouts/Base.astro`
- Modify: `src/styles/global.css`
- Modify: `src/components/Hero.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: Great Vibes through `var(--font-display)`
- Produces: Young Serif through `var(--font-homepage-display)` for homepage category titles and subtitles

- [ ] **Step 1: Record the failing homepage-font assertions**

Confirm `@fontsource/young-serif` and `--font-homepage-display` are absent and that `.cat-name` and `.cat-blurb` currently use `var(--font-display)`.

Expected: the assertions fail the revised requirement because the homepage uses Great Vibes.

- [ ] **Step 2: Restore the local Young Serif package and import**

Run `npm install @fontsource/young-serif`. Add `import '@fontsource/young-serif';` beside the Great Vibes import in `src/layouts/Base.astro`.

- [ ] **Step 3: Add the homepage display token**

In `src/styles/global.css`, add:

```css
--font-homepage-display: 'Young Serif', Georgia, serif;
```

- [ ] **Step 4: Apply Young Serif to homepage titles and subtitles**

Use `font-family: var(--font-homepage-display)` only for `.cat-name` and `.cat-blurb` in `src/pages/index.astro`. Keep `.tagline`, `.intro h1`, `.cta-line`, and the navigation and footer wordmarks on Great Vibes.

- [ ] **Step 5: Verify revised typography assertions**

Confirm both Fontsource packages/imports and both display tokens exist, `.cat-name` and `.cat-blurb` use the homepage token, and `.tagline`, `.intro h1`, `.cta-line`, global headings, and wordmarks use `var(--font-display)`.

Expected: all assertions pass.

### Task 4: Build and Visual Verification

**Files:**
- Verify: generated `dist/` output
- Verify: homepage, gallery, category, contact, and links routes

**Interfaces:**
- Consumes: Tasks 1, 2, and 3
- Produces: build and visual evidence for the typography change

- [ ] **Step 1: Run the production build**

Run `npm run build`.

Expected: exit code 0 and Astro reports `build Complete!`.

- [ ] **Step 2: Verify bundled font references**

Run `rg -n "Great Vibes|great-vibes" dist src package.json package-lock.json`.

Expected: Great Vibes and Young Serif both appear in source/build output and dependencies.

- [ ] **Step 3: Inspect responsive routes**

Start `npm run dev`. Inspect `/`, `/gallery`, available category pages, `/contact`, and `/links` at approximately 390px and 1440px widths.

Expected: homepage category titles and subtitles use Young Serif; other headings and branding use Great Vibes; body copy and controls remain Karla; no display text clips or overlaps.

- [ ] **Step 4: Review the final diff**

Run `git diff --check`, `git status --short`, and `git diff --stat`.

Expected: no whitespace errors and only planned files have changed.

- [ ] **Step 5: Commit the implementation**

Stage the dependency, import, token, subtitle style, and plan files. Commit with `git commit -m "apply Great Vibes display typography"`.

Expected: one commit containing the verified implementation and plan.
