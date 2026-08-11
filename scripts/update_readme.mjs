#!/usr/bin/env node
/**
 * update_readme — regenerate README.md (+ preview.html, gitignored) from
 * `.github/scripts/listings.json`. Run from anywhere; paths resolve relative to
 * this script's repo. Used by the update-readme.yml GitHub Action and available
 * for local rebuilds. Zero deps.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderReadme, renderPreview } from './render_readme.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LISTINGS = path.join(ROOT, '.github', 'scripts', 'listings.json');

const data = JSON.parse(fs.readFileSync(LISTINGS, 'utf8'));
const { md, repoTotal, xmasCount } = renderReadme(data);
fs.writeFileSync(path.join(ROOT, 'README.md'), md);
fs.writeFileSync(path.join(ROOT, 'preview.html'), renderPreview(md));
console.log(`README.md regenerated: ${repoTotal} active roles (${xmasCount} seasonal) as of ${data.meta.as_of}`);
