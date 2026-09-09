import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'react/index': 'src/react/index.tsx',
    'exercises/index': 'src/exercises/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // One build, so the ESM output code-splits the geometry core into a shared
  // chunk instead of copying it into the React bundle as well.
  splitting: true,
  treeshake: true,
  external: ['react'],
  // Rollup strips module-level directives while bundling, so `"use client"` is
  // put back afterwards. Without it, importing the component into a Next.js App
  // Router server component throws on the first hook.
  onSuccess: 'node scripts/add-use-client.mjs',
});
