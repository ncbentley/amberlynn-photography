# Gallery Shoot Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop forcing a title/date/story "event narrative" on every batch of photos, and stop rendering per-batch headers on category pages, so adding photos is genuinely "drop a folder in and go."

**Architecture:** `title` and `date` become optional on the `shoots` content-collection schema; the category page drops its per-shoot heading/story markup but keeps each shoot as its own image grid (so `layout_hint` still varies per batch); the homepage featured strip and the sort helper get null-safe fallbacks for the now-optional fields; the ingest script stops forcing a placeholder story and updates its guidance; CLAUDE.md's Operation 1 is rewritten to match.

**Tech Stack:** Astro 7 content collections (Zod schemas), `.astro` pages/components, Node.js ingest script (`sharp`). No test framework is installed in this project — verification is via `npm run build` (which runs full Zod validation + static-site generation, so schema and runtime errors surface as build failures) and inspecting the generated static HTML in `dist/`, matching this project's existing "Verify locally" convention from CLAUDE.md.

## Global Constraints

- Do not touch `src/components/`, `src/layouts/`, `src/styles/`, or any root config file except `src/content.config.ts` (explicitly in scope here) — per CLAUDE.md, but this plan is the explicitly authorized exception for the files it names.
- `alt` text per photo stays **required** — do not make it optional (accessibility, unrelated to this change).
- Keep calling the grouping unit "shoots" — no renaming of files, folders, or vocabulary.
- No data migration: the 9 existing shoot folders under `src/content/shoots/` must build unchanged.
- This shell's `PATH` may be missing Homebrew's bin dir. If `npm: command not found` occurs, prefix commands with `PATH="/opt/homebrew/bin:$PATH"` as shown below.
- Use the scratchpad directory for any temporary files: `/private/tmp/claude-501/-Users-brodybentley-Amber-Website/08a96fc1-4829-4bcf-9995-430e429849e2/scratchpad`

---

## Task 1: Loosen the shoot schema and null-safe the date sort

**Files:**
- Modify: `src/content.config.ts:70,72` (the `shoots` schema's `title` and `date` fields)
- Modify: `src/lib/shoots.ts:9-11` (`byDateDesc`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `CollectionEntry<'shoots'>.data.title` is now `string | undefined`; `.data.date` is now `Date | undefined`. Every later task that reads `shoot.data.title` or `shoot.data.date` must handle the `undefined` case — this is what Tasks 2 and 3 do.

These two changes must land together: making the fields optional without fixing the sort would crash every build the moment a shoot omits `date` (`b.data.date.valueOf()` throws on `undefined`).

- [ ] **Step 1: Create a temporary fixture shoot that omits `title` and `date`, to prove the current (unmodified) schema rejects it**

```bash
mkdir -p "src/content/shoots/_tmp-optional-fields-test"
cp "src/content/shoots/palisade-prom-send-off/01.webp" "src/content/shoots/_tmp-optional-fields-test/01.webp"
cat > "src/content/shoots/_tmp-optional-fields-test/index.mdx" << 'EOF'
---
category: seniors
cover: ./01.webp
images:
  - src: ./01.webp
    alt: Temporary fixture image for schema verification.
layout_hint: masonry
featured: false
---
EOF
```

- [ ] **Step 2: Run the build and confirm it fails on the missing fields**

Run: `PATH="/opt/homebrew/bin:$PATH" npm run build`
Expected: FAIL — `[InvalidContentEntryDataError] shoots → _tmp-optional-fields-test data does not match collection schema`, listing `title: Required` and a `date` type error (e.g. `Expected type "date", received "object"`).

- [ ] **Step 3: Make `title` and `date` optional in the schema**

In `src/content.config.ts`, inside the `shoots` collection's schema object:

```typescript
// before
        title: z.string(),
        category: existingCategory(),
        date: z.coerce.date(),
```

```typescript
// after
        title: z.string().optional(),
        category: existingCategory(),
        date: z.coerce.date().optional(),
```

- [ ] **Step 4: Run the build again and confirm it now fails at runtime instead of at schema validation**

Run: `PATH="/opt/homebrew/bin:$PATH" npm run build`
Expected: FAIL — `[ERROR] TypeError: Cannot read properties of undefined (reading 'valueOf')`, stack trace pointing at `byDateDesc` in `shoots_*.mjs`, while rendering `/gallery/seniors` — because the fixture shoot's `date` is now `undefined` and the sort still assumes a `Date`.

- [ ] **Step 5: Make `byDateDesc` null-safe**

In `src/lib/shoots.ts`:

```typescript
// before
/** Sort shoots newest first. */
export function byDateDesc(a: CollectionEntry<'shoots'>, b: CollectionEntry<'shoots'>): number {
  return b.data.date.valueOf() - a.data.date.valueOf();
}
```

```typescript
// after
/** Sort shoots newest first. A missing date sorts to the back (oldest). */
export function byDateDesc(a: CollectionEntry<'shoots'>, b: CollectionEntry<'shoots'>): number {
  const aTime = a.data.date?.valueOf() ?? 0;
  const bTime = b.data.date?.valueOf() ?? 0;
  return bTime - aTime;
}
```

- [ ] **Step 6: Run the build and confirm it now passes with the undated fixture in place**

Run: `PATH="/opt/homebrew/bin:$PATH" npm run build`
Expected: PASS — `[build] Complete!`, no Zod or runtime errors.

- [ ] **Step 7: Remove the temporary fixture and confirm the build still passes cleanly**

```bash
rm -rf "src/content/shoots/_tmp-optional-fields-test"
```

Run: `PATH="/opt/homebrew/bin:$PATH" npm run build`
Expected: PASS — same clean `[build] Complete!`, back to the original 9 shoots.

- [ ] **Step 8: Commit**

```bash
git add src/content.config.ts src/lib/shoots.ts
git commit -m "make shoot title/date optional, null-safe the date sort"
```

---

## Task 2: Strip per-shoot headers and story from the category page

**Files:**
- Modify: `src/pages/gallery/[category].astro` (whole file — removes the `render` import, the `rendered` mapping, the `monthYear` formatter, the `shoot-head`/story markup, and the now-unused `.shoot-head h2` / `.story` / `.story :global(p + p)` styles)

**Interfaces:**
- Consumes: `byDateDesc` from `src/lib/shoots.ts` (unchanged signature, now null-safe per Task 1); `ImageGrid` component (unchanged — still takes `images` and `variant` props).
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Rewrite `src/pages/gallery/[category].astro`**

Replace the entire file with:

```astro
---
import Base from '../../layouts/Base.astro';
import ImageGrid from '../../components/ImageGrid.astro';
import { getCollection } from 'astro:content';
import { byDateDesc } from '../../lib/shoots';

export async function getStaticPaths() {
  const categories = await getCollection('categories');
  return categories.map((category) => ({
    params: { category: category.id },
    props: { category },
  }));
}

const { category } = Astro.props;

const shoots = (
  await getCollection('shoots', (s) => s.data.category.id === category.id)
).sort(byDateDesc);
---

<Base title={category.data.displayName} description={category.data.blurb}>
  <div class="category-page">
    <p class="back">
      <a href="/gallery">← All work</a>
    </p>
    <header class="page-head">
      <h1>{category.data.displayName}</h1>
      <p class="blurb">{category.data.blurb}</p>
    </header>

    {
      shoots.map((shoot) => (
        <div class="shoot">
          <ImageGrid images={shoot.data.images} variant={shoot.data.layout_hint} />
        </div>
      ))
    }
  </div>
</Base>

<style>
  .category-page {
    padding: clamp(1.5rem, 4vw, 3rem) var(--space-gutter) var(--space-section);
    max-width: 1400px;
    margin-inline: auto;
  }

  .back {
    margin: 0 0 clamp(2rem, 5vw, 3.5rem);
  }

  .back a {
    font-size: 0.8125rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--umber);
    text-decoration: none;
    transition: color 150ms ease;
  }

  .back a:hover {
    color: var(--gold);
  }

  .page-head h1 {
    font-size: clamp(2.5rem, 6vw, 4.25rem);
  }

  .blurb {
    margin-top: 1rem;
    color: var(--umber);
    max-width: var(--measure);
  }

  .shoot {
    margin-top: var(--space-section);
  }
</style>
```

- [ ] **Step 2: Build and confirm no headers/story remain in the rendered category page**

Run: `PATH="/opt/homebrew/bin:$PATH" npm run build`
Expected: PASS.

```bash
grep -o 'class="shoot-head"' dist/gallery/seniors/index.html
```
Expected: no output (the class no longer exists anywhere in the file).

```bash
grep -o "<h2" dist/gallery/seniors/index.html | wc -l
```
Expected: `0` (the file is emitted as minified single-line HTML, so use `-o | wc -l` for an accurate occurrence count rather than `-c`, which counts matching lines. Before this task the same command returns `3` — one `<h2>` per shoot in the seniors category; `category.data.displayName` renders as `<h1>`, not `<h2>`, so it's unaffected).

```bash
grep -c "<img" dist/gallery/seniors/index.html
```
Expected: a number greater than `0` (the images themselves are still rendered — only the headers/story went away).

- [ ] **Step 3: Commit**

```bash
git add src/pages/gallery/[category].astro
git commit -m "drop per-shoot headers and story from category pages"
```

---

## Task 3: Fall back the homepage featured caption and alt text when title is missing

**Files:**
- Modify: `src/pages/index.astro:49-59` (the `feat-item` anchor inside the featured-strip map)

**Interfaces:**
- Consumes: `shoot.data.title` (now possibly `undefined`, per Task 1), `shoot.data.cover`, `category?.data.displayName`, `shoot.data.category.id` — all pre-existing.
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Update the featured-item markup**

In `src/pages/index.astro`, inside the `picked.map((shoot) => { ... })` block:

```astro
// before
              <a class="feat-item" href={`/gallery/${shoot.data.category.id}`}>
                <Image
                  src={shoot.data.cover}
                  alt={`${shoot.data.title} — ${category?.data.displayName ?? shoot.data.category.id}`}
                  widths={[480, 828, 1280, 1600]}
                  sizes="(min-width: 900px) 60vw, 100vw"
                  loading="lazy"
                />
                <span class="eyebrow">{category?.data.displayName ?? shoot.data.category.id}</span>
                <span class="feat-title">{shoot.data.title}</span>
              </a>
```

```astro
// after
              <a class="feat-item" href={`/gallery/${shoot.data.category.id}`}>
                <Image
                  src={shoot.data.cover}
                  alt={
                    shoot.data.title
                      ? `${shoot.data.title} — ${category?.data.displayName ?? shoot.data.category.id}`
                      : (category?.data.displayName ?? shoot.data.category.id)
                  }
                  widths={[480, 828, 1280, 1600]}
                  sizes="(min-width: 900px) 60vw, 100vw"
                  loading="lazy"
                />
                <span class="eyebrow">{category?.data.displayName ?? shoot.data.category.id}</span>
                {shoot.data.title && <span class="feat-title">{shoot.data.title}</span>}
              </a>
```

- [ ] **Step 2: Verify existing (titled) shoots still show their caption**

Run: `PATH="/opt/homebrew/bin:$PATH" npm run build`
Expected: PASS.

```bash
grep -o '<span class="eyebrow"[^>]*>[^<]*</span><span class="feat-title"[^>]*>[^<]*</span>' dist/index.html
```
Expected: 4 lines, one per existing featured shoot, each pairing its category eyebrow with its title span, e.g.:
```
<span class="eyebrow" data-astro-cid-lcdefpme>Engagements</span><span class="feat-title" data-astro-cid-lcdefpme>Fruita Back Fields Engagement</span>
```

- [ ] **Step 3: Verify an untitled featured shoot falls back cleanly (temporary fixture)**

```bash
mkdir -p "src/content/shoots/_tmp-no-title-featured-test"
cp "src/content/shoots/palisade-prom-send-off/01.webp" "src/content/shoots/_tmp-no-title-featured-test/01.webp"
cat > "src/content/shoots/_tmp-no-title-featured-test/index.mdx" << 'EOF'
---
category: family
cover: ./01.webp
images:
  - src: ./01.webp
    alt: Temporary fixture image for homepage fallback verification.
layout_hint: masonry
featured: true
EOF
```

Note: this fixture is in the `family` category, which the existing 4 featured shoots don't already occupy in the "one per category" pass — check first:

```bash
grep -o 'href="/gallery/[a-z]*"' dist/index.html | sort -u
```

If `family` is not already among the 4 links printed, the fixture is guaranteed to be picked (the homepage logic fills one slot per category first). Then:

Run: `PATH="/opt/homebrew/bin:$PATH" npm run build`
Expected: PASS.

```bash
python3 -c "
import re
with open('dist/index.html') as f:
    html = f.read()
m = re.search(r'<a class=\"feat-item\" href=\"/gallery/family\"[^>]*>.*?</a>', html, re.DOTALL)
print(m.group(0) if m else 'NOT FOUND')
"
```
Expected: the matched anchor ends with `<span class="eyebrow" data-astro-cid-lcdefpme>Family</span></a>` — an eyebrow with no `feat-title` span after it, proving the fallback (no title → no caption span) works.

- [ ] **Step 4: Remove the temporary fixture and confirm the build is clean**

```bash
rm -rf "src/content/shoots/_tmp-no-title-featured-test"
```

Run: `PATH="/opt/homebrew/bin:$PATH" npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro
git commit -m "fall back homepage featured caption when shoot has no title"
```

---

## Task 4: Stop forcing a story placeholder in the ingest script

**Files:**
- Modify: `scripts/ingest.mjs:8-17` (top doc comment), `:157-169` (stub template), `:179-194` (completion message)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new consumed by later tasks (CLAUDE.md in Task 5 documents this script's behavior, but doesn't call it).

- [ ] **Step 1: Update the top doc comment**

```javascript
// before
 *   4. Writes a stub index.mdx that builds immediately but is marked with
 *      "EDIT ME" placeholders for title/date/alt text/story.
```

```javascript
// after
 *   4. Writes a stub index.mdx that builds immediately, with sensible
 *      auto-filled title/date, and an "EDIT ME" placeholder alt for each
 *      photo — the only thing that must be edited before publishing.
```

- [ ] **Step 2: Drop the forced story paragraph from the stub template**

```javascript
// before
    const stub = `---
title: ${titleCase(slug)}
category: ${category}
date: ${today}
cover: ./${outputNames[0]}
images:
${imagesYaml}
layout_hint: masonry
featured: false
---

EDIT ME: one to three sentences about this session.
`;
```

```javascript
// after
    const stub = `---
title: ${titleCase(slug)}
category: ${category}
date: ${today}
cover: ./${outputNames[0]}
images:
${imagesYaml}
layout_hint: masonry
featured: false
---
`;
```

- [ ] **Step 3: Update the completion message**

```javascript
// before
  console.log(`
Done. ${outputNames.length} image(s) processed (max ${LONGEST_EDGE}px, WebP, metadata stripped).

New shoot stub: src/content/shoots/${slug}/index.mdx

Next, edit that file:
  1. title      — currently "${titleCase(slug)}"; change if you want something different
  2. date       — currently today; set it to the shoot date
  3. alt        — replace every "EDIT ME" with a real one-line description of that photo
  4. story      — replace the body line below the --- with 1-3 sentences about the session
  5. featured   — set to true if this shoot's images should appear in the gallery/landing highlights
  6. cover      — currently ./${outputNames[0]}; point it at the strongest image
  7. layout_hint — masonry (default), editorial, or full

Then check it locally with: npm run dev
`);
```

```javascript
// after
  console.log(`
Done. ${outputNames.length} image(s) processed (max ${LONGEST_EDGE}px, WebP, metadata stripped).

New shoot stub: src/content/shoots/${slug}/index.mdx

This shoot is ready to publish as soon as you fix the alt text below.
Everything else is optional — edit it only if you want to:
  1. alt         — replace every "EDIT ME" with a real one-line description of that photo (required)
  2. featured    — set to true if this shoot's images should appear in the gallery/landing highlights
  3. cover       — currently ./${outputNames[0]}; point it at the strongest image
  4. layout_hint — masonry (default), editorial, or full
  5. title, date — currently "${titleCase(slug)}" / ${today}; only shown if this shoot ends up
                   featured on the homepage, so change them only if you want something specific

Then check it locally with: npm run dev
`);
```

**Note (found during implementation):** `today` is declared inside the `try` block earlier in `main()` (alongside `now`), but this completion message is a `console.log` call *after* that `try`/`catch` — so `today` is out of scope here as originally written. Hoist the `const now = new Date()` / `const today = ...` declaration (and its accompanying comment about local-date vs. `toISOString()`) to just before the `try` block so both the stub template and this completion message can reference it.

- [ ] **Step 4: Run the script end-to-end against a scratch source folder and inspect the generated stub**

```bash
mkdir -p "/private/tmp/claude-501/-Users-brodybentley-Amber-Website/08a96fc1-4829-4bcf-9995-430e429849e2/scratchpad/ingest-test-source"
cp "src/content/shoots/palisade-prom-send-off/01.webp" "/private/tmp/claude-501/-Users-brodybentley-Amber-Website/08a96fc1-4829-4bcf-9995-430e429849e2/scratchpad/ingest-test-source/test-01.webp"
cp "src/content/shoots/palisade-prom-send-off/02.webp" "/private/tmp/claude-501/-Users-brodybentley-Amber-Website/08a96fc1-4829-4bcf-9995-430e429849e2/scratchpad/ingest-test-source/test-02.webp"
PATH="/opt/homebrew/bin:$PATH" npm run ingest "/private/tmp/claude-501/-Users-brodybentley-Amber-Website/08a96fc1-4829-4bcf-9995-430e429849e2/scratchpad/ingest-test-source" seniors ingest-script-test
cat "src/content/shoots/ingest-script-test/index.mdx"
```
Expected: frontmatter with `title`, `category: seniors`, `date`, `cover`, two `images` entries each with `alt: "EDIT ME: describe this photo"`, `layout_hint: masonry`, `featured: false` — and **nothing** after the closing `---` (no story placeholder line). The printed console summary should show the new "ready to publish as soon as you fix the alt text" wording.

- [ ] **Step 5: Confirm the generated shoot still builds**

Run: `PATH="/opt/homebrew/bin:$PATH" npm run build`
Expected: PASS (the `EDIT ME` alt text is valid, just not great copy — the schema doesn't reject it).

- [ ] **Step 6: Clean up the scratch shoot and source folder**

```bash
rm -rf "src/content/shoots/ingest-script-test"
rm -rf "/private/tmp/claude-501/-Users-brodybentley-Amber-Website/08a96fc1-4829-4bcf-9995-430e429849e2/scratchpad/ingest-test-source"
```

Run: `PATH="/opt/homebrew/bin:$PATH" npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/ingest.mjs
git commit -m "stop forcing a story placeholder in the ingest stub"
```

---

## Task 5: Rewrite CLAUDE.md's Operation 1 to match the new workflow

**Files:**
- Modify: `CLAUDE.md` (the "Operation 1: Add a shoot" section)

**Interfaces:**
- Consumes: nothing (documentation only).
- Produces: nothing.

- [ ] **Step 1: Replace the "Operation 1" section**

```markdown
// before
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
```

```markdown
// after
## Operation 1: Add photos

Run the ingest script (it resizes to 2400px, converts to WebP, and strips EXIF/GPS metadata — important because client photos are taken at their homes):

```
npm run ingest ~/Desktop/rivera-photos weddings rivera-wedding
```

Arguments: source folder, existing category id, new shoot slug (any short, url-friendly name for this batch of photos — it's never shown to visitors). It creates `src/content/shoots/rivera-wedding/` with `01.webp, 02.webp, ...` and a stub `index.mdx`. The stub is ready to publish as soon as you fix the alt text — everything else is optional:

```mdx
---
title: Rivera Wedding
category: weddings
date: 2026-06-20
cover: ./01.webp
images:
  - src: ./01.webp
    alt: "EDIT ME: describe this photo"
  - src: ./02.webp
    alt: "EDIT ME: describe this photo"
layout_hint: masonry
featured: false
---
```

- `alt` — the one thing you must edit. Replace every `EDIT ME` with a real one-line description of that photo. Never leave `EDIT ME` in a published shoot.
- `title` / `date` — optional, and never shown on the site itself. `title` only ever surfaces as a caption if this shoot is featured on the homepage (see Operation 4) — leave the auto-filled values alone unless you want something more specific.
- `featured: true` puts this shoot's images into the gallery highlights and landing page (see Operation 4).
- `layout_hint` — `masonry` (default, mixed grid — right for most shoots), `editorial` (larger, magazine-style pacing — for small curated sets), `full` (each image full width — only when every image deserves the whole screen).

There's no story or event write-up to fill in — just point the script at a folder of photos and fix the alt text.
```

- [ ] **Step 2: Confirm the rest of CLAUDE.md is still internally consistent**

```bash
grep -n "shoot date\|story\|EDIT ME" CLAUDE.md
```
Expected: no remaining reference to asking the owner for a shoot date or a story write-up in Operation 1. (Any other unrelated `EDIT ME`/story mentions elsewhere in the file, if present, are out of scope for this task — only Operation 1 is being rewritten.)

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "rewrite CLAUDE.md Operation 1 for the lighter shoot workflow"
```

---

## Final check

- [ ] **Run the full build one more time from a clean state to confirm all 9 original shoots and every page still build correctly end to end**

Run: `PATH="/opt/homebrew/bin:$PATH" npm run build`
Expected: PASS — `[build] 7 page(s) built`, no errors.

```bash
git status
```
Expected: clean working tree (everything committed task-by-task above), no leftover `_tmp-*` or `ingest-script-test` directories under `src/content/shoots/`.
