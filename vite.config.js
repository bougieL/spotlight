import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

const host = process.env.TAURI_DEV_HOST;

// Plugin public directories
const pluginPublicDirs = [
  { name: "color-picker-plugin", path: "./packages/color-picker-plugin/public" },
];

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    vue(),
    // Custom plugin to serve plugin public files
    {
      name: "plugin-public-files",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url.split("?")[0];

          for (const plugin of pluginPublicDirs) {
            if (url.startsWith(`/plugins/${plugin.name}/`)) {
              const filename = url.replace(`/plugins/${plugin.name}/`, "");
              const filePath = join(plugin.path, filename);

              if (existsSync(filePath)) {
                const content = readFileSync(filePath);
                const ext = filename.split(".").pop();
                const contentType = ext === "html" ? "text/html" : "text/plain";
                res.setHeader("Content-Type", contentType);
                res.end(content);
                return;
              }
            }
          }
          next();
        });
      },
    },
  ],

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@spotlight/core": resolve(__dirname, "./packages/core/src"),
      "@spotlight/i18n": resolve(__dirname, "./packages/i18n/src"),
      "@spotlight/api": resolve(__dirname, "./packages/api/src"),
      "@spotlight/input": resolve(__dirname, "./packages/input/src"),
      "@spotlight/panel": resolve(__dirname, "./packages/panel/src"),
      "@spotlight/plugin-registry": resolve(__dirname, "./packages/plugin-registry/src"),
      "@spotlight/app-search-plugin": resolve(__dirname, "./packages/app-search-plugin/src"),
      "@spotlight/calculator-plugin": resolve(__dirname, "./packages/calculator-plugin/src"),
      "@spotlight/settings-plugin": resolve(__dirname, "./packages/settings-plugin/src"),
      "@spotlight/theme": resolve(__dirname, "./packages/theme"),
      "@spotlight/components": resolve(__dirname, "./packages/components/src"),
      "@spotlight/clipboard-plugin": resolve(__dirname, "./packages/clipboard-plugin/src"),
      "@spotlight/recent-plugin": resolve(__dirname, "./packages/recent-plugin/src"),
      "@spotlight/logger": resolve(__dirname, "./packages/logger/src"),
      "@spotlight/chrome-bookmarks-plugin": resolve(__dirname, "./packages/chrome-bookmarks-plugin/src"),
      "@spotlight/qrcode-plugin": resolve(__dirname, "./packages/qrcode-plugin/src"),
      "@spotlight/json-plugin": resolve(__dirname, "./packages/json-plugin/src"),
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
