import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/adapters/BunSQLiteAdapter.ts', 'src/adapters/NodeSQLiteAdapter.ts', 'src/adapters/BetterSqlite3SQLiteAdapter.ts','src/adapters/PGLiteAdapter.ts'],
  format: ['esm'],
  external: ["bun:sqlite","node:sqlite"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  removeNodeProtocol: false,
  outDir: 'dist'
});
