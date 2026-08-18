#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderPreview, renderReadme } from "./render_readme.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function buildReadme({
  root = ROOT,
  check = false,
  preview = true,
} = {}) {
  const listingsPath = path.join(root, ".github", "scripts", "listings.json");
  const readmePath = path.join(root, "README.md");
  const data = JSON.parse(fs.readFileSync(listingsPath, "utf8"));
  const { md, repoTotal, xmasCount } = renderReadme(data);

  if (check) {
    const current = fs.readFileSync(readmePath, "utf8");
    if (current !== md) {
      throw new Error("README.md is out of date. Run: npm run build-readme");
    }
  } else {
    fs.writeFileSync(readmePath, md);
    if (preview)
      fs.writeFileSync(path.join(root, "preview.html"), renderPreview(md));
  }

  return { asOf: data.meta.as_of, repoTotal, xmasCount, check };
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const result = buildReadme({
      check: process.argv.includes("--check"),
      preview: !process.argv.includes("--no-preview"),
    });
    console.log(
      `${result.check ? "README check passed" : "README.md regenerated"}: ` +
        `${result.repoTotal} active roles (${result.xmasCount} seasonal) as of ${result.asOf}`,
    );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
