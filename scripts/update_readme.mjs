#!/usr/bin/env node
/** Backwards-compatible entrypoint used by the existing daily pipeline. */
import { buildReadme } from './build-readme.mjs';

const result = buildReadme();
console.log(
  `README.md regenerated: ${result.repoTotal} active roles ` +
    `(${result.xmasCount} seasonal) as of ${result.asOf}`
);
