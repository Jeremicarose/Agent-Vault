import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['index.ts'],
  format: ['esm'],
  tsconfig: './tsconfig.json',
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node22',
})
