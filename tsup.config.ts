import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/drivers/BunSQLiteDriver.ts', 'src/drivers/NodeSQLiteDriver.ts', 'src/drivers/BetterSqlite3SQLiteDriver.ts','src/drivers/PGLiteDriver.ts'],
  format: ['esm'],
  external: ["bun:sqlite","node:sqlite"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  removeNodeProtocol: false,
  outDir: 'dist'
});
