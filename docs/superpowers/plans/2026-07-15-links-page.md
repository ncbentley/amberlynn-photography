# Facebook Link + Links Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Facebook link across the site and a new `/links` page listing every way to reach the photographer (Gallery, Contact, Email, Instagram, TikTok, Facebook) — the one URL she can put in her Instagram/TikTok bio.

**Architecture:** `facebook` becomes a new required field on the `site` content-collection schema, stored as a full URL (unlike Instagram/TikTok, which store bare handles and build the URL programmatically). The footer and contact page get a third social link alongside Instagram/TikTok. A new `src/pages/links.astro` page reuses the existing `Base` layout and renders a small, centered stack of link buttons built from the same settings data.

**Tech Stack:** Astro 7 content collections (Zod schemas), `.astro` pages/layouts. No test framework is installed in this project — verification is via `npm run build` (exercises full Zod validation + static-site generation) and grepping the generated static HTML in `dist/`, matching this project's existing convention.

## Global Constraints

- The stored Facebook URL is the canonical page URL with tracking params stripped: `https://www.facebook.com/people/Amberlynn-Lafae-Photography/61566921280369/` — not the share-link URL with `?mibextid=...&rdid=...&share_url=...` query params.
- Every social link (Instagram, TikTok, Facebook) shows a fixed label as its visible text — "Instagram", "TikTok", "Facebook" — never the handle or raw URL. (Originally Instagram/TikTok showed their handle as text; the site owner asked mid-execution to make all three consistent — see Task 4.)
- `/links` reuses the existing `Base` layout (same nav/footer as every other page) — no separate visual theme, no bio text, no photo.
- `/links` link order: Gallery, Contact, Email, Instagram, TikTok, Facebook.
- This shell's `PATH` may be missing Homebrew's bin dir. If `npm: command not found` occurs, prefix commands with `PATH="/opt/homebrew/bin:$PATH"` as shown below.

---

## Task 1: Add the `facebook` field to the site schema and settings content

**Files:**
- Modify: `src/content.config.ts:38-39` (the `site` collection's schema object)
- Modify: `src/content/site/settings.md:7-8` (the frontmatter)

**Interfaces:**
- Consumes: nothing new.
- Produces: `CollectionEntry<'site'>.data.facebook` is now a required `string` (a full URL). Tasks 2 and 3 read `s.facebook` directly — no handle-stripping, unlike `s.instagram`/`s.tiktok`.

Because `site` has exactly one entry (`settings.md`), there's no throwaway fixture for this test cycle — editing the real settings file *is* the change being verified. The two steps below double as RED (schema requires a field the content doesn't have yet) and GREEN (content supplies it).

- [ ] **Step 1: Add the schema field**

In `src/content.config.ts`, inside the `site` collection's schema object:

```typescript
// before
        instagram: z.string(),
        tiktok: z.string(),
        formspreeId: z.string(),
```

```typescript
// after
        instagram: z.string(),
        tiktok: z.string(),
        facebook: z.string().url(),
        formspreeId: z.string(),
```

- [ ] **Step 2: Run the build and confirm it fails because `settings.md` doesn't have `facebook` yet**

Run: `PATH="/opt/homebrew/bin:$PATH" npm run build`
Expected: FAIL — `[InvalidContentEntryDataError] site → settings data does not match collection schema`, naming `facebook: Required`.

- [ ] **Step 3: Add the value to settings.md**

In `src/content/site/settings.md`:

```yaml
# before
instagram: "@amberlynn_lafae_photography"
tiktok: "@Amberlynn_lafae_photog_"
formspreeId: YOUR_FORM_ID
```

```yaml
# after
instagram: "@amberlynn_lafae_photography"
tiktok: "@Amberlynn_lafae_photog_"
facebook: https://www.facebook.com/people/Amberlynn-Lafae-Photography/61566921280369/
formspreeId: YOUR_FORM_ID
```

Note: no quotes needed around the Facebook URL — unlike `instagram`/`tiktok`, it doesn't start with `@`, so YAML parses it as a plain string without help.

- [ ] **Step 4: Run the build and confirm it now passes**

Run: `PATH="/opt/homebrew/bin:$PATH" npm run build`
Expected: PASS — `[build] Complete!`, no Zod errors.

- [ ] **Step 5: Commit**

```bash
git add src/content.config.ts src/content/site/settings.md
git commit -m "add facebook field to site settings schema"
```

---

## Task 2: Add the Facebook link to the footer and contact page

**Files:**
- Modify: `src/layouts/Base.astro:50-54` (the footer's `.footer-links` block)
- Modify: `src/pages/contact.astro:18-22` (the `.reach` list)

**Interfaces:**
- Consumes: `s.facebook` (from Task 1 — a full URL string, no stripping needed).
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Add the footer link**

In `src/layouts/Base.astro`:

```astro
// before
        <div class="footer-links">
          <a href={`mailto:${s.email}`}>{s.email}</a>
          <a href={`https://instagram.com/${instagramHandle}`}>{s.instagram}</a>
          <a href={`https://www.tiktok.com/${s.tiktok}`}>{s.tiktok}</a>
        </div>
```

```astro
// after
        <div class="footer-links">
          <a href={`mailto:${s.email}`}>{s.email}</a>
          <a href={`https://instagram.com/${instagramHandle}`}>{s.instagram}</a>
          <a href={`https://www.tiktok.com/${s.tiktok}`}>{s.tiktok}</a>
          <a href={s.facebook}>Facebook</a>
        </div>
```

- [ ] **Step 2: Add the contact-page link**

In `src/pages/contact.astro`:

```astro
// before
        <ul class="reach">
          <li><a href={`mailto:${s.email}`}>{s.email}</a></li>
          <li><a href={`https://instagram.com/${instagramHandle}`}>{s.instagram}</a></li>
          <li><a href={`https://www.tiktok.com/${s.tiktok}`}>{s.tiktok}</a></li>
        </ul>
```

```astro
// after
        <ul class="reach">
          <li><a href={`mailto:${s.email}`}>{s.email}</a></li>
          <li><a href={`https://instagram.com/${instagramHandle}`}>{s.instagram}</a></li>
          <li><a href={`https://www.tiktok.com/${s.tiktok}`}>{s.tiktok}</a></li>
          <li><a href={s.facebook}>Facebook</a></li>
        </ul>
```

- [ ] **Step 3: Build and verify both links render with the fixed "Facebook" label and the correct href**

Run: `PATH="/opt/homebrew/bin:$PATH" npm run build`
Expected: PASS.

```bash
grep -o '<a href="https://www.facebook.com/people/Amberlynn-Lafae-Photography/61566921280369/"[^>]*>Facebook</a>' dist/index.html dist/contact/index.html
```
Expected: one match per file (footer renders on every page via `Base`, so `dist/index.html`'s match is the footer; `dist/contact/index.html` will show two matches — footer + the contact-page `.reach` list entry).

```bash
grep -c '<a href="https://www.facebook.com/people/Amberlynn-Lafae-Photography/61566921280369/"' dist/contact/index.html
```
Expected: `1` (this counts matching *lines*, not occurrences, since the build emits minified single-line HTML — both the footer and `.reach` list links live on that one line, so this only confirms the line exists; the previous grep already confirmed there are two actual occurrences by showing two matches).

- [ ] **Step 4: Commit**

```bash
git add src/layouts/Base.astro src/pages/contact.astro
git commit -m "add facebook link to footer and contact page"
```

---

## Task 3: Add the `/links` page

**Files:**
- Create: `src/pages/links.astro`

**Interfaces:**
- Consumes: `s.email`, `s.instagram`, `s.tiktok`, `s.facebook`, `s.photographerName`, `s.wordmark` (all from the `site` collection; `facebook` from Task 1).
- Produces: nothing consumed by later tasks (this plan's last task).

- [ ] **Step 1: Create the page**

Create `src/pages/links.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import { getEntry } from 'astro:content';

const settings = await getEntry('site', 'settings');
if (!settings) throw new Error('Missing src/content/site/settings.md');
const s = settings.data;
const instagramHandle = s.instagram.replace(/^@/, '');

const links = [
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact' },
  { href: `mailto:${s.email}`, label: 'Email' },
  { href: `https://instagram.com/${instagramHandle}`, label: 'Instagram' },
  { href: `https://www.tiktok.com/${s.tiktok}`, label: 'TikTok' },
  { href: s.facebook, label: 'Facebook' },
];
---

<Base title="Links" description={`Find ${s.photographerName} online.`}>
  <div class="links-page">
    <h1>{s.wordmark}</h1>
    <ul class="link-list">
      {
        links.map((link) => (
          <li>
            <a href={link.href}>{link.label}</a>
          </li>
        ))
      }
    </ul>
  </div>
</Base>

<style>
  .links-page {
    padding: clamp(3rem, 8vw, 5rem) var(--space-gutter) var(--space-section);
    max-width: 32rem;
    margin-inline: auto;
    text-align: center;
  }

  h1 {
    font-size: clamp(2rem, 5vw, 2.75rem);
    margin-bottom: clamp(2rem, 5vw, 3rem);
  }

  .link-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 1rem;
  }

  .link-list a {
    display: block;
    padding: 1rem 1.5rem;
    border: 1px solid var(--umber);
    border-radius: 999px;
    color: var(--ink);
    text-decoration: none;
    font-weight: 500;
    transition:
      background-color 150ms ease,
      border-color 150ms ease;
  }

  .link-list a:hover,
  .link-list a:focus-visible {
    background-color: var(--shade);
    border-color: var(--gold);
  }
</style>
```

- [ ] **Step 2: Build and verify the page exists with all six links in order**

Run: `PATH="/opt/homebrew/bin:$PATH" npm run build`
Expected: PASS, and the file list now includes `dist/links/index.html`.

Note: as of the mid-execution labeling change (see Task 4), Instagram and
TikTok show fixed labels ("Instagram"/"TikTok") rather than the handle as
visible text — both in `.link-list` here and in the footer rendered by
`Base.astro`. That means a page-wide grep will show duplicate "Instagram" /
"TikTok" / "Facebook" text (once from `.link-list`, once from the footer),
so scope the check to `.link-list` directly:

```bash
python3 -c "
import re
with open('dist/links/index.html') as f:
    html = f.read()
m = re.search(r'<ul class=\"link-list\"[^>]*>.*?</ul>', html, re.DOTALL)
print(m.group(0) if m else 'NOT FOUND')
"
```
Expected: six `<li><a href=...>...</a></li>` entries, in this exact order:
```
<li><a href="/gallery">Gallery</a></li>
<li><a href="/contact">Contact</a></li>
<li><a href="mailto:Amberlynnlafae@gmail.com">Email</a></li>
<li><a href="https://instagram.com/amberlynn_lafae_photography">Instagram</a></li>
<li><a href="https://www.tiktok.com/@Amberlynn_lafae_photog_">TikTok</a></li>
<li><a href="https://www.facebook.com/people/Amberlynn-Lafae-Photography/61566921280369/">Facebook</a></li>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/links.astro
git commit -m "add /links page"
```

---

## Task 4: Change Instagram/TikTok link labels to fixed text (mid-execution scope change)

**Why:** After Task 2 shipped, the site owner asked for Instagram and TikTok
to display as fixed labels ("Instagram"/"TikTok") instead of the handle as
visible link text — matching how Facebook already displays. This task fixes
the two spots Task 2 already committed (footer, contact page). Task 3 above
already uses the fixed-label form from the start, so it needs no follow-up.

**Files:**
- Modify: `src/layouts/Base.astro` (the footer's `.footer-links` block)
- Modify: `src/pages/contact.astro` (the `.reach` list)

**Interfaces:**
- Consumes: `s.instagram`, `s.tiktok` (still used to build the `href`, just no
  longer used as the visible text).
- Produces: nothing new consumed by later tasks (last task in this plan).

- [ ] **Step 1: Update the footer**

In `src/layouts/Base.astro`:

```astro
// before
        <div class="footer-links">
          <a href={`mailto:${s.email}`}>{s.email}</a>
          <a href={`https://instagram.com/${instagramHandle}`}>{s.instagram}</a>
          <a href={`https://www.tiktok.com/${s.tiktok}`}>{s.tiktok}</a>
          <a href={s.facebook}>Facebook</a>
        </div>
```

```astro
// after
        <div class="footer-links">
          <a href={`mailto:${s.email}`}>{s.email}</a>
          <a href={`https://instagram.com/${instagramHandle}`}>Instagram</a>
          <a href={`https://www.tiktok.com/${s.tiktok}`}>TikTok</a>
          <a href={s.facebook}>Facebook</a>
        </div>
```

- [ ] **Step 2: Update the contact page**

In `src/pages/contact.astro`:

```astro
// before
        <ul class="reach">
          <li><a href={`mailto:${s.email}`}>{s.email}</a></li>
          <li><a href={`https://instagram.com/${instagramHandle}`}>{s.instagram}</a></li>
          <li><a href={`https://www.tiktok.com/${s.tiktok}`}>{s.tiktok}</a></li>
          <li><a href={s.facebook}>Facebook</a></li>
        </ul>
```

```astro
// after
        <ul class="reach">
          <li><a href={`mailto:${s.email}`}>{s.email}</a></li>
          <li><a href={`https://instagram.com/${instagramHandle}`}>Instagram</a></li>
          <li><a href={`https://www.tiktok.com/${s.tiktok}`}>TikTok</a></li>
          <li><a href={s.facebook}>Facebook</a></li>
        </ul>
```

- [ ] **Step 3: Build and verify the labels changed but hrefs didn't**

Run: `PATH="/opt/homebrew/bin:$PATH" npm run build`
Expected: PASS.

```bash
grep -o '<a href="https://instagram.com/[^"]*">[^<]*</a>\|<a href="https://www.tiktok.com/[^"]*">[^<]*</a>' dist/index.html dist/contact/index.html
```
Expected: every match shows `>Instagram<` or `>TikTok<` as the text, with the
`href` still pointing at `https://instagram.com/amberlynn_lafae_photography`
and `https://www.tiktok.com/@Amberlynn_lafae_photog_` respectively — the
handle moved out of the visible text but the link target didn't change.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/Base.astro src/pages/contact.astro
git commit -m "show fixed Instagram/TikTok labels instead of handles"
```

---

## Final check

- [ ] **Run a full clean build and confirm every page still builds correctly**

```bash
rm -rf dist
PATH="/opt/homebrew/bin:$PATH" npm run build
```
Expected: PASS — `[build] 7 page(s) built` (the existing 6 plus the new `/links` page), no errors.

```bash
git status
```
Expected: clean working tree for everything this plan touched (the unrelated pre-existing WIP in `CLAUDE.md`, `README.md`, `scripts/ingest.mjs`, `src/components/ContactForm.astro`, `src/pages/index.astro` from earlier work is a separate, known matter — not part of this plan's scope, and shouldn't be committed by it).
