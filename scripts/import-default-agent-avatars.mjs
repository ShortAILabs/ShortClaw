#!/usr/bin/env zx

import 'zx/globals';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';

const SOURCE_DIR = '/Users/dyh/Desktop/Claw';
const OUTPUT_DIR = join(process.cwd(), 'resources', 'agent-avatars', 'default');
const MANIFEST_PATH = join(OUTPUT_DIR, 'manifest.json');
const ACCEPTED_EXT_RE = /\.(png|jpe?g|webp)$/i;

function slugify(fileName) {
  return basename(fileName, extname(fileName))
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

async function main() {
  const entries = (await readdir(SOURCE_DIR))
    .filter((file) => ACCEPTED_EXT_RE.test(file))
    .sort((a, b) => a.localeCompare(b));

  if (entries.length === 0) {
    throw new Error(`No supported avatar images found in ${SOURCE_DIR}`);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const avatars = [];

  for (const file of entries) {
    const avatarId = slugify(file);
    if (!avatarId) {
      throw new Error(`Unable to derive avatar id from file: ${file}`);
    }

    const inputPath = join(SOURCE_DIR, file);
    const srcFileName = `${avatarId}.webp`;
    const thumbFileName = `${avatarId}-thumb.webp`;

    await sharp(inputPath)
      .flop()
      .resize(512, 512, { fit: 'cover', position: 'attention' })
      .webp({ quality: 88 })
      .toFile(join(OUTPUT_DIR, srcFileName));

    await sharp(inputPath)
      .flop()
      .resize(96, 96, { fit: 'cover', position: 'attention' })
      .webp({ quality: 82 })
      .toFile(join(OUTPUT_DIR, thumbFileName));

    avatars.push({
      avatarId,
      src: srcFileName,
      thumbSrc: thumbFileName,
      sourceFile: file,
    });
  }

  await writeFile(
    MANIFEST_PATH,
    `${JSON.stringify({ version: 1, avatars }, null, 2)}\n`,
    'utf8',
  );

  console.log(`Imported ${avatars.length} default agent avatars`);
}

await main();
