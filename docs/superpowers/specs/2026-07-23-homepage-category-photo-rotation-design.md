# Homepage Category Photo Rotation

## Goal

Rotate every featured photo from each category through that category's image spot on the homepage.

## Behavior

- Each category card uses the photos from shoots in that category marked `featured: true`.
- The first image appears immediately and the remaining images cycle automatically.
- Images crossfade every four seconds.
- Category rotations are staggered so all three cards do not change simultaneously.
- The entire category card remains a link to its existing gallery page.
- If a category has only one featured image, it remains static.
- Visitors who request reduced motion see the first image without animation.

## Implementation

The homepage will provide all featured category images to each card rather than only the newest shoot cover. Each image will use Astro's image optimization and share the existing 4:5 card frame. A small page-local script will activate one image at a time and schedule staggered transitions. The implementation remains contained in `src/pages/index.astro`.

## Accessibility and Failure Handling

- Rotating images are decorative within an already labeled category link, so duplicate announcements will be avoided.
- Reduced-motion preferences disable rotation.
- JavaScript-disabled browsers retain a visible first image.
- Missing or empty categories preserve the current no-image behavior.

## Verification

- Confirm each category renders all eight featured images.
- Confirm only one image per card is visible at a time.
- Confirm rotation is staggered and links remain usable.
- Confirm reduced-motion mode remains static.
- Run `npm run build` and visually inspect the homepage at desktop and mobile widths.
