# Facebook link + link-in-bio page

Date: 2026-07-15

## Problem

The photographer wants one link she can put in her Instagram/TikTok bio that
leads to all her other links (email, socials, and the site itself), rather
than picking just one URL to feature. She also wants a Facebook link added
alongside the existing Instagram/TikTok links, which don't currently exist
on the site.

## Decisions

- **New site on her own domain, not a third-party tool.** A new page on the
  existing site (`/links`), not an external link-in-bio service — no new
  dependency, matches the site's design, and there's nothing to sign up for.
- **Minimal content.** The links page is just a list of links: Gallery,
  Contact, Email, Instagram, TikTok, Facebook — no bio text, no photo, no
  separate visual identity from the rest of the site.
- **Facebook is a new site-wide field**, shown everywhere Instagram/TikTok
  already are (footer, contact page), not just on the new links page.
- **Facebook is stored as a full URL**, not a handle. Instagram/TikTok store
  bare handles (`@name`) and the templates build the profile URL
  programmatically. The photographer's actual Facebook link is a `/people/
  <name>/<numeric-id>/` URL with no clean handle to extract, so `facebook`
  is stored as the complete URL and used as-is.
- **Facebook's visible link text is the fixed label "Facebook"**, not the
  URL itself. A raw `/people/.../61566921280369/` URL would look wrong as
  visible text.
- **Update (post-implementation):** the site owner asked, after Facebook
  shipped, to make Instagram and TikTok match — fixed labels ("Instagram",
  "TikTok") instead of the handle as visible text. All three social links
  now use the same fixed-label pattern everywhere they appear (footer,
  contact page, `/links`). The `href` still uses the handle/URL as before —
  only the visible text changed.
- **The stored Facebook URL is the canonical page URL, tracking params
  stripped.** The URL the photographer provided included Facebook's
  share-tracking query string (`?mibextid=...&rdid=...&share_url=...`),
  which is generated per-share and not meant for a permanent link. The
  canonical URL without that query string is what gets stored:
  `https://www.facebook.com/people/Amberlynn-Lafae-Photography/61566921280369/`

## Changes

### `src/content.config.ts`
- Add `facebook: z.string().url()` to the `site` collection schema, next to
  `instagram`/`tiktok`.

### `src/content/site/settings.md`
- Add `facebook: https://www.facebook.com/people/Amberlynn-Lafae-Photography/61566921280369/`

### `src/layouts/Base.astro` (footer)
- Add a Facebook link in the footer's link list, after the TikTok link:
  `<a href={s.facebook}>Facebook</a>` — no handle-stripping needed since
  `s.facebook` is already the full URL.

### `src/pages/contact.astro`
- Add the same Facebook link to the `.reach` list, after the TikTok entry,
  same markup as the footer's.

### `src/pages/links.astro` (new)
- Uses the existing `Base` layout (same nav/footer as the rest of the site).
- Body is a single centered stack of link buttons, in this order:
  1. Gallery → `/gallery`
  2. Contact → `/contact`
  3. Email → `mailto:${s.email}`
  4. Instagram → `https://instagram.com/${instagramHandle}` (same
     handle-stripping as `Base.astro`/`contact.astro`)
  5. TikTok → `https://www.tiktok.com/${s.tiktok}`
  6. Facebook → `s.facebook`
- Button labels: "Gallery", "Contact", "Email", the Instagram handle
  (`s.instagram`), the TikTok handle (`s.tiktok`), "Facebook" — matching how
  each link's text already reads elsewhere on the site (Gallery/Contact are
  plain nav-style labels; Instagram/TikTok show the handle; Facebook shows
  the fixed label per the decision above).
- Page title: "Links — Amberlynn" (via the `Base` layout's `title` prop,
  consistent with how other pages set their title).

## Non-goals / out of scope

- No third-party link-in-bio service.
- No bio text, profile photo, or custom visual theme for `/links` — it reuses
  the site's existing look via `Base`.
- No per-photo or per-shoot changes — this is site-settings and layout only.
- No change to the existing Instagram/TikTok display pattern (handle as
  visible text) — only Facebook gets the fixed-label treatment, since only
  Facebook lacks a clean handle.

## Testing / verification

- This project has no automated test framework. Verification is `npm run
  build` (exercises the new required `facebook` schema field against
  `settings.md`) plus a visual/DOM check of `/links`, the footer, and
  `/contact` for the new Facebook link, and confirming `/gallery` and
  `/contact` links on the new page resolve correctly.
