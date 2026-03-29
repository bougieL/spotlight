import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const host = process.env.TAURI_DEV_HOST;

// Auto-discover packages and generate aliases
const packagesDir = resolve(__dirname, "./packages");
const packageAliases = {};
const allPackages = [];

try {
  const packages = readdirSync(packagesDir, { withFileTypes: true });
  for (const dir of packages) {
    if (dir.isDirectory()) {
      const packagePath = resolve(packagesDir, dir.name);
      const packageJsonPath = join(packagePath, "package.json");

      if (!existsSync(packageJsonPath)) continue;

      allPackages.push(dir.name);

      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      const packageName = packageJson.name;

      // Add alias if src directory exists
      const srcPath = join(packagePath, "src");
      if (existsSync(srcPath)) {
        packageAliases[packageName] = srcPath;
      }

    }
  }
} catch (error) {
  console.error("Failed to auto-discover packages:", error);
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        colorPicker: resolve(__dirname, "packages/color-picker-plugin/color-picker.html"),
        screenshot: resolve(__dirname, "packages/screenshot-plugin/screenshot.html"),
      },
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router'],
          'vendor-components': ['@spotlight/components', '@spotlight/input'],
          'vendor-ai': ['@spotlight/ai-core'],
          'vendor-marked': ['marked'],
        },
      },
    },
  },

  plugins: [
    vue(),
  ],

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      ...packageAliases,
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
      : {
          overlay: false,  // 禁用错误遮罩减少冲突
        },
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
