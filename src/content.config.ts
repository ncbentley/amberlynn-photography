import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { readdirSync } from 'node:fs';

// Astro resolves reference() lazily, which lets a shoot pointing at a
// missing category build silently and just vanish from the site. Check
// eagerly against the actual files so a typo fails the build instead.
const categoryIds = readdirSync(new URL('./content/categories', import.meta.url))
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''));

const existingCategory = () =>
  reference('categories').superRefine((val, ctx) => {
    const id = typeof val === 'string' ? val : (val as { id?: string })?.id;
    if (id && !categoryIds.includes(id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `category "${id}" does not exist — valid categories: ${categoryIds.join(', ')}`,
      });
    }
  });

/**
 * The editing contract. Content that doesn't match these schemas fails the
 * build with a readable error — the live site is never touched by a bad push.
 */

const site = defineCollection({
  loader: glob({ pattern: 'settings.md', base: './src/content/site' }),
  schema: ({ image }) =>
    z
      .object({
        photographerName: z.string(),
        wordmark: z.string(),
        tagline: z.string(),
        location: z.string(),
        email: z.string().email(),
        instagram: z.string(),
        tiktok: z.string(),
        facebook: z.string().url(),
        formspreeId: z.string(),
        pricingLine: z.string(),
        heroImage: image(),
        heroAlt: z.string(),
        introHeading: z.string(),
        introText: z.string(),
        ctaLine: z.string(),
        ctaLinkText: z.string(),
        contactHeading: z.string(),
        contactIntro: z.string(),
      })
      .strict(),
});

const categories = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/categories' }),
  schema: z
    .object({
      displayName: z.string(),
      subtitle: z.string(),
      order: z.number().int(),
      blurb: z.string(),
      featuredCount: z.number().int().default(8),
    })
    .strict(),
});

const shoots = defineCollection({
  loader: glob({ pattern: '*/index.mdx', base: './src/content/shoots' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().optional(),
        category: existingCategory(),
        date: z.coerce.date().optional(),
        cover: image(),
        images: z
          .array(
            z
              .object({
                src: image(),
                alt: z.string(),
              })
              .strict()
          )
          .min(1),
        layout_hint: z.enum(['masonry', 'editorial', 'full']).default('masonry'),
        featured: z.boolean().default(false),
      })
      .strict(),
});

export const collections = { site, categories, shoots };
