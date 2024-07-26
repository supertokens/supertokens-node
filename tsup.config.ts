import { defineConfig } from "tsup";

export default defineConfig({
    tsconfig: "./tsconfig.json",
    entry: ["./lib/ts/**/*.ts"],
    target: "node16",
    bundle: false,
    clean: true,
    dts: false,
    format: ["cjs", "esm"],
    outDir: "./lib/build",
    sourcemap: false,
    splitting: false,
    minify: false,
});
