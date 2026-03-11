import { defineConfig } from 'tsup'
import { copyFileSync, mkdirSync } from 'fs'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: false,
  // Bundle local source files to handle ESM resolution
  // External dependencies stay external (installed via node_modules)
  bundle: true,
  onSuccess: async () => {
    // Copy public assets to dist
    mkdirSync('dist/public', { recursive: true })
    copyFileSync('public/favicon.ico', 'dist/public/favicon.ico')
  },
})
