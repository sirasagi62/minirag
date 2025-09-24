import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['db.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist'
});