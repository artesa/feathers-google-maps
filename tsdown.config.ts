import { defineConfig } from 'tsdown'
import type { UserConfig } from 'tsdown'
import pkg from './package.json' with { type: 'json' }

const config: UserConfig = defineConfig({
  entry: ['./src/index.ts', './src/legacy.ts'],
  deps: {
    neverBundle: [
      // regex for "node:*" imports
      /^node:.*/,
      ...Object.keys(pkg.devDependencies),
    ],
  },
  dts: true,
  sourcemap: true,
  format: ['esm'],
  fixedExtension: false,
  outDir: 'dist',
})

export default config
