# Allura Typography Design

## Goal

Use Allura for the site's expressive display typography while preserving Karla for readable interface and body copy.

## Typography Scope

Allura will become the primary display font. It will apply to:

- Page titles and section headings
- The Amberlynn wordmark and other branding text
- Prominent subtitle-style text outside the homepage

The category card titles and subtitles on the homepage will retain their original Young Serif typography. The homepage hero tagline, intro title, CTA subtitle, and branding elements such as the Amberlynn wordmark will use Allura.

Karla will remain in use for:

- Paragraphs and longer descriptive copy
- Navigation links
- Form labels, fields, and buttons
- Captions, metadata, and small interface labels

## Font Delivery

Install and import Allura through Fontsource, matching the site's existing self-hosted font setup. Retain Young Serif as a second locally bundled display face for the homepage category titles and subtitles. This avoids runtime requests to external font providers and keeps both fonts available as part of the built site.

Allura is licensed under the SIL Open Font License and is permitted for commercial use.

## Implementation Boundaries

Update the global display-font variable for Allura and add a separate homepage-category display-font variable for Young Serif. Assign the category variable only to the homepage category card titles and subtitles. Do not alter content, layout, imagery, colors, or unrelated typography. Retain appropriate fallbacks in both display-font stacks.

Because Allura has taller letterforms and pronounced flourishes, check headings and branding at desktop and mobile widths for clipping, overlap, and wrapping. Adjust typography spacing only where required for legibility.

## Verification

- Run the production build.
- Confirm the generated site includes both Allura and Young Serif locally.
- Inspect the homepage, gallery, category, contact, and links pages at desktop and mobile widths.
- Confirm homepage category titles and subtitles use Young Serif, other headings and branding use Allura, and body copy, controls, navigation links, captions, and small labels remain in Karla.
