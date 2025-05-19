import { defineConfig } from 'tsdown';
import pkg from "./package.json";

export default defineConfig({
  entry: ['./src/index.ts'],
  external: [
    // regex for "node:*" imports
    /^node:.*/,
    ...Object.keys(pkg.dependencies),
    ...Object.keys(pkg.devDependencies),
  ],
  dts: true,
  sourcemap: true,
  format: ["esm"],
  outDir: "dist"
});
