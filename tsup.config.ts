import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  external: ["bun:sqlite"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist'
});
