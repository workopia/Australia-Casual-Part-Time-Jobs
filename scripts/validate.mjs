#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TIERS = new Set(["Casual", "Part-time", "Temp & Seasonal"]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validDate(value) {
  return nonEmptyString(value) && !Number.isNaN(new Date(value).getTime());
}

export function validateRepository(root = ROOT) {
  const errors = [];
  const fail = (message) => errors.push(message);
  const listingsPath = path.join(root, ".github", "scripts", "listings.json");
  const activePath = path.join(root, "data", "active.json");
  const data = readJson(listingsPath);
  const activeData = readJson(activePath);

  for (const field of [
    "repo",
    "title",
    "country_iso",
    "country_name",
    "adjective",
    "segment",
    "as_of",
    "generated_at",
  ]) {
    if (!nonEmptyString(data.meta?.[field]))
      fail(`meta.${field} must be a non-empty string`);
  }
  if (data.meta?.country_iso !== "AU") fail("meta.country_iso must be AU");
  if (!validDate(data.meta?.as_of)) fail("meta.as_of must be a valid date");
  if (!validDate(data.meta?.generated_at))
    fail("meta.generated_at must be a valid date");
  if (!Number.isInteger(data.meta?.window_days) || data.meta.window_days < 1) {
    fail("meta.window_days must be a positive integer");
  }

  if (!Array.isArray(data.categories) || data.categories.length === 0) {
    fail("categories must be a non-empty array");
  }
  const categoryKeys = new Set();
  for (const [index, category] of (data.categories ?? []).entries()) {
    const prefix = `categories[${index}]`;
    if (!nonEmptyString(category.key)) fail(`${prefix}.key is required`);
    if (!nonEmptyString(category.name)) fail(`${prefix}.name is required`);
    if (!nonEmptyString(category.icon)) fail(`${prefix}.icon is required`);
    if (categoryKeys.has(category.key))
      fail(`${prefix}.key duplicates ${category.key}`);
    categoryKeys.add(category.key);
  }

  if (!Array.isArray(data.listings) || data.listings.length === 0) {
    fail("listings must be a non-empty array");
  }

  function validateRows(rows, label, { requireCategory = true } = {}) {
    const ids = new Set();
    for (const [index, row] of (rows ?? []).entries()) {
      const prefix = `${label}[${index}]`;
      for (const field of ["id", "company_name", "title", "location", "url"]) {
        if (!nonEmptyString(String(row[field] ?? "")))
          fail(`${prefix}.${field} is required`);
      }
      const id = String(row.id ?? "");
      if (ids.has(id)) fail(`${prefix}.id duplicates ${id}`);
      ids.add(id);
      if (!TIERS.has(row.tier)) fail(`${prefix}.tier is invalid: ${row.tier}`);
      if (requireCategory && !categoryKeys.has(row.category)) {
        fail(`${prefix}.category is not declared: ${row.category}`);
      }
      if (row.date_posted !== null && !validDate(row.date_posted)) {
        fail(`${prefix}.date_posted must be a valid date-time or null`);
      }
      if (typeof row.active !== "boolean")
        fail(`${prefix}.active must be boolean`);
      try {
        const url = new URL(row.url);
        if (
          url.origin !== "https://workopia.io" ||
          url.pathname !== `/jobs/${id}` ||
          url.search
        ) {
          fail(
            `${prefix}.url must be the canonical Workopia job URL for ${id}`,
          );
        }
      } catch {
        fail(`${prefix}.url is invalid`);
      }
    }
    return ids;
  }

  const listingIds = validateRows(data.listings, "listings");
  validateRows(data.seasonal ?? [], "seasonal");

  const activeRows = data.listings.filter((row) => row.active !== false);
  if (activeRows.length !== listingIds.size) {
    fail(
      "listings must not contain inactive or duplicate rows in this live repository",
    );
  }
  if (activeData.asOf !== data.meta?.as_of) {
    fail(
      `data/active.json asOf (${activeData.asOf}) must match meta.as_of (${data.meta?.as_of})`,
    );
  }
  const activeEntries = Object.entries(activeData.jobs ?? {});
  if (activeData.count !== activeEntries.length) {
    fail(
      `data/active.json count (${activeData.count}) does not match jobs (${activeEntries.length})`,
    );
  }
  if (activeData.count !== activeRows.length) {
    fail(
      `data/active.json count (${activeData.count}) does not match active listings (${activeRows.length})`,
    );
  }
  for (const [id, row] of activeEntries) {
    if (String(row.id) !== id)
      fail(`data/active.json job ${id} has mismatched id ${row.id}`);
    if (!listingIds.has(id))
      fail(`data/active.json job ${id} is absent from listings.json`);
    for (const field of ["company", "role", "location"]) {
      if (!nonEmptyString(row[field]))
        fail(`data/active.json job ${id}.${field} is required`);
    }
  }

  if (errors.length) {
    throw new Error(
      `Repository validation failed (${errors.length}):\n- ${errors.join("\n- ")}`,
    );
  }

  return {
    asOf: data.meta.as_of,
    activeRoles: activeRows.length,
    employers: new Set(activeRows.map((row) => row.company_name)).size,
    categories: categoryKeys.size,
    seasonalRows: (data.seasonal ?? []).length,
  };
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const summary = validateRepository();
    console.log(
      `Validation passed: ${summary.activeRoles} roles, ${summary.employers} employers, ` +
        `${summary.categories} categories as of ${summary.asOf}`,
    );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
