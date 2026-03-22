import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [vue()],

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@spotlight/core": resolve(__dirname, "./packages/core/src"),
      "@spotlight/api": resolve(__dirname, "./packages/api/src"),
      "@spotlight/input": resolve(__dirname, "./packages/input/src"),
      "@spotlight/panel": resolve(__dirname, "./packages/panel/src"),
      "@spotlight/plugin-registry": resolve(__dirname, "./packages/plugin-registry/src"),
      "@spotlight/sample-plugin": resolve(__dirname, "./packages/sample-plugin/src"),
      "@spotlight/app-search-plugin": resolve(__dirname, "./packages/app-search-plugin/src"),
      "@spotlight/calculator-plugin": resolve(__dirname, "./packages/calculator-plugin/src"),
      "@spotlight/settings-plugin": resolve(__dirname, "./packages/settings-plugin/src"),
      "@spotlight/theme": resolve(__dirname, "./packages/theme"),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
