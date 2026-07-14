#!/usr/bin/env node
/**
 * Ingest a folder of photos into a new shoot.
 *
 * Usage:
 *   npm run ingest <source-folder> <category> <shoot-slug>
 *
 * What it does:
 *   1. Reads every image (jpg/jpeg/png/webp/tif/tiff/heic) in <source-folder>,
 *      sorted by filename.
 *   2. Applies EXIF orientation, resizes to a 2400px longest edge, converts to
 *      WebP (quality 80), and STRIPS all metadata (EXIF/GPS) — client photos
 *      are often taken at their homes, so location data must never ship.
 *   3. Writes 01.webp, 02.webp, ... into src/content/shoots/<shoot-slug>/.
 *   4. Writes a stub index.mdx that builds immediately but is marked with
 *      "EDIT ME" placeholders for title/date/alt text/story.
 */

import { existsSync } from 'node:fs';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const categoriesDir = path.join(root, 'src', 'content', 'categories');
const shootsDir = path.join(root, 'src', 'content', 'shoots');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.heic']);
const LONGEST_EDGE = 2400;
const WEBP_QUALITY = 80;

function fail(message) {
  console.error(`\nError: ${message}\n`);
  process.exit(1);
}

function usage() {
  console.error(`
Usage: npm run ingest <source-folder> <category> <shoot-slug>

  <source-folder>  Folder containing the photos to import (jpg/jpeg/png/webp/tiff/heic)
  <category>       An existing category id — a filename (without .md) in src/content/categories/
  <shoot-slug>     URL-friendly name for the new shoot, e.g. rivera-wedding
                   (lowercase letters, numbers, and hyphens)

Example:
  npm run ingest ~/Desktop/rivera-photos weddings rivera-wedding
`);
  process.exit(1);
}

function titleCase(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

async function main() {
  const [sourceArg, category, slug] = process.argv.slice(2);
  if (!sourceArg || !category || !slug) usage();

  // --- Validate slug ---
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    fail(
      `"${slug}" is not a valid slug. Use only lowercase letters, numbers, and hyphens (e.g. rivera-wedding).`
    );
  }

  // --- Validate source folder ---
  const sourceDir = path.resolve(sourceArg);
  if (!existsSync(sourceDir) || !(await stat(sourceDir)).isDirectory()) {
    fail(`Source folder not found: ${sourceDir}`);
  }

  // --- Validate category against src/content/categories/ ---
  const categoryIds = (await readdir(categoriesDir))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
    .sort();
  if (!categoryIds.includes(category)) {
    fail(
      `"${category}" is not an existing category.\n` +
        `Valid categories: ${categoryIds.join(', ')}\n` +
        `(To add a new category, create src/content/categories/${category}.md first — see CLAUDE.md.)`
    );
  }

  // --- Refuse to overwrite an existing shoot ---
  const shootDir = path.join(shootsDir, slug);
  if (existsSync(shootDir)) {
    fail(
      `A shoot named "${slug}" already exists at src/content/shoots/${slug}/.\n` +
        `Pick a new slug, or delete that folder first if you mean to replace it.`
    );
  }

  // --- Collect source images, sorted by filename ---
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const imageFiles = entries
    .filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

  if (imageFiles.length === 0) {
    fail(
      `No images found in ${sourceDir}.\n` +
        `Supported formats: jpg, jpeg, png, webp, tif, tiff, heic.`
    );
  }

  // --- Process ---
  console.log(`\nIngesting ${imageFiles.length} image(s) from ${sourceDir}`);
  console.log(`  -> src/content/shoots/${slug}/  (category: ${category})\n`);

  await mkdir(shootDir, { recursive: true });
  const pad = Math.max(2, String(imageFiles.length).length);
  const outputNames = [];

  try {
    for (let i = 0; i < imageFiles.length; i++) {
      const inputPath = path.join(sourceDir, imageFiles[i]);
      const outName = `${String(i + 1).padStart(pad, '0')}.webp`;
      const outPath = path.join(shootDir, outName);

      try {
        // .rotate() bakes in the EXIF orientation BEFORE metadata is stripped.
        // No .withMetadata(): sharp drops EXIF/GPS by default, which is the
        // point — never publish location data from photos taken at clients' homes.
        await sharp(inputPath)
          .rotate()
          .resize(LONGEST_EDGE, LONGEST_EDGE, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY })
          .toFile(outPath);
      } catch (err) {
        throw new Error(
          `Could not process "${imageFiles[i]}": ${err.message}\n` +
            `(If this is a HEIC file, this machine's sharp build may not support HEIC — ` +
            `convert it to JPEG first and retry.)`
        );
      }

      outputNames.push(outName);
      console.log(`  ${imageFiles[i]}  ->  ${outName}`);
    }

    // --- Write stub index.mdx ---
    // Local date, not toISOString() (UTC), so evening ingests don't stamp tomorrow.
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const imagesYaml = outputNames
      .map((name) => `  - src: ./${name}\n    alt: "EDIT ME: describe this photo"`)
      .join('\n');

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

    await writeFile(path.join(shootDir, 'index.mdx'), stub, 'utf8');
  } catch (err) {
    // Don't leave a half-written shoot behind.
    await rm(shootDir, { recursive: true, force: true });
    fail(err.message);
  }

  // --- Summary ---
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
}

main().catch((err) => fail(err.message));
