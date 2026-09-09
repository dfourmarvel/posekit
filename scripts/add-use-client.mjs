import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/**
 * Put `"use client"` back on the React entry after bundling.
 *
 * Rollup strips module-level directives when it bundles, and warns that it did.
 * A React component that loses the directive and is then imported into a
 * Next.js App Router server component throws on its first hook, so this is not
 * cosmetic — it is the difference between the package working in the framework
 * most of its users are on, and not.
 */
const targets = ['dist/react/index.js', 'dist/react/index.cjs'];
const DIRECTIVE = '"use client";';

let patched = 0;
for (const file of targets) {
  if (!existsSync(file)) {
    console.error(`add-use-client: expected ${file} to exist after the build`);
    process.exitCode = 1;
    continue;
  }
  const source = await readFile(file, 'utf8');
  if (source.startsWith(DIRECTIVE) || source.startsWith("'use client';")) continue;

  // The CJS output opens with "use strict"; the directive has to sit above it,
  // because a directive prologue stops at the first non-directive statement.
  await writeFile(file, `${DIRECTIVE}\n${source}`, 'utf8');
  patched += 1;
}

if (patched) console.log(`add-use-client: patched ${patched} file(s)`);
