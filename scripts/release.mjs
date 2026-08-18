#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildReadme } from "./build-readme.mjs";
import { validateRepository } from "./validate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sha256(file) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

const summary = validateRepository(ROOT);
buildReadme({ root: ROOT, check: true, preview: false });

const listingsPath = path.join(ROOT, ".github", "scripts", "listings.json");
const activePath = path.join(ROOT, "data", "active.json");
const data = JSON.parse(fs.readFileSync(listingsPath, "utf8"));
const rows = data.listings.filter((row) => row.active !== false);
const noExperience = rows.filter((row) => row.no_experience).length;
const categoryCounts = Object.fromEntries(
  data.categories.map((category) => [
    category.name,
    rows.filter((row) => row.category === category.key).length,
  ]),
);
const release = {
  tag: `data-${summary.asOf}`,
  asOf: summary.asOf,
  activeRoles: summary.activeRoles,
  employers: summary.employers,
  seasonalRoles: data.meta.seasonal_live_roles ?? data.seasonal?.length ?? 0,
  noExperienceRoles: noExperience,
  categories: categoryCounts,
  checksums: {
    ".github/scripts/listings.json": sha256(listingsPath),
    "data/active.json": sha256(activePath),
  },
};
const markdown = `# Australia casual jobs data — ${release.asOf}

- Active roles: ${release.activeRoles.toLocaleString("en-AU")}
- Employers represented: ${release.employers.toLocaleString("en-AU")}
- Seasonal and Christmas roles tracked: ${release.seasonalRoles.toLocaleString("en-AU")}
- Roles explicitly open to no-experience applicants: ${release.noExperienceRoles.toLocaleString("en-AU")}

## Category totals

${Object.entries(categoryCounts)
  .map(([name, count]) => `- ${name}: ${count.toLocaleString("en-AU")}`)
  .join("\n")}

Generated from employer career-site postings. Roles may close before the next refresh; confirm on the job page.
`;

if (process.argv.includes("--write")) {
  const dist = path.join(ROOT, "dist");
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, `${release.tag}.md`), markdown);
  fs.writeFileSync(
    path.join(dist, `${release.tag}.json`),
    `${JSON.stringify(release, null, 2)}\n`,
  );
  console.log(`Release artifacts written to dist/${release.tag}.{md,json}`);
} else {
  process.stdout.write(markdown);
}
