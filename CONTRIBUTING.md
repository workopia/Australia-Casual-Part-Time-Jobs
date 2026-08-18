# Contributing

Thanks for helping keep this list accurate! 🙏

## How this list is built

This repository is **generated automatically by [Workopia](https://workopia.io)** and refreshed **daily**. The structured source of truth is [`.github/scripts/listings.json`](./.github/scripts/listings.json); `README.md` is rendered from it by `scripts/build-readme.mjs` (a GitHub Action verifies and re-renders it whenever the data changes — never edit README.md by hand). The compact public snapshot is [`data/active.json`](./data/active.json).

Every role is sourced **straight from the employer's official career page / ATS feed** — never scraped from another job board — and each **Apply →** link opens the role on Workopia, where you get an AI match score, a tailored CV & cover letter, and a direct link to the employer's official posting.

Employment type (**Casual / Part-time / Temp & seasonal**) is classified by Workopia's own tagging pipeline, not copied from the ad's free text. Pay, shift and ticket columns are read from what the employer published — always confirm on the job page before applying.

## How to contribute

Because the list is generated from live data, the most useful contribution is **reporting problems**:

- **A role is closed, wrong, mislabelled, or duplicated?** → [Open an issue](../../issues/new/choose) using the "Report a role" form.
- **We're missing an employer that hires casuals** (a chain, a venue group, a stadium, an agency)? → open an issue with their careers-page URL. That is the single most useful thing you can send us.

We review reports and fix the source data so the daily rebuild picks up the correction.

## Validate a change locally

Node.js 20 or later is the only requirement; there are no package dependencies.

```bash
npm run validate
npm run build-readme
npm run check
```

- `npm run validate` checks both JSON datasets, canonical job URLs, required fields, duplicate IDs, categories, tiers and dates.
- `npm run build-readme` deterministically rebuilds `README.md` from the dataset timestamp.
- `npm run check` is the same read-only gate used on pull requests.
- `npm run release` writes reviewable release notes and checksums to the ignored `dist/` directory. It does not publish or push anything.

The machine-readable contract is [`.github/schema/listings.schema.json`](./.github/schema/listings.schema.json).

## Categories currently covered

🛍️ Retail & Supermarket · 🍽️ Hospitality & Food · 📦 Warehouse, Delivery & Driving · 🧑‍⚕️ Care & Disability Support · 🎤 Events, Promo & Casual Staffing · 🧹 Cleaning & Facilities · 🎓 Campus, Tutoring & Childcare — each split into **Casual / Part-time / Temp & seasonal**.

The full, always-fresh list lives at **[workopia.io/browsejobs/au/casual](https://workopia.io/browsejobs/au/casual)** (search and filter by role, city and date).
