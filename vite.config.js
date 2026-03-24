import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { lookup } from "mime-types";

const host = process.env.TAURI_DEV_HOST;

// Auto-discover packages and generate aliases
const packagesDir = resolve(__dirname, "./packages");
const packageAliases = {};
const pluginPublicDirs = [];

try {
  const packages = readdirSync(packagesDir, { withFileTypes: true });
  for (const dir of packages) {
    if (dir.isDirectory()) {
      const packagePath = resolve(packagesDir, dir.name);
      const packageJsonPath = join(packagePath, "package.json");

      if (!existsSync(packageJsonPath)) continue;

      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      const packageName = packageJson.name;

      // Add alias if src directory exists
      const srcPath = join(packagePath, "src");
      if (existsSync(srcPath)) {
        packageAliases[packageName] = srcPath;
      }

      // Auto-detect public directories for plugins
      const publicPath = join(packagePath, "public");
      if (existsSync(publicPath)) {
        pluginPublicDirs.push({ name: dir.name, path: publicPath });
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
        colorPicker: resolve(__dirname, "packages/color-picker-plugin/public/color-picker.html"),
      },
    },
  },

  plugins: [
    vue(),
    // Custom plugin to serve plugin public files and handle plugin scripts
    {
      name: "plugin-public-files",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url.split("?")[0];

          // Handle /src/plugins/{plugin}/ path -> transform TS via Vite
          if (url.startsWith("/src/plugins/")) {
            const relativePath = url.replace("/src/plugins/", "");
            const parts = relativePath.split("/");
            const pluginName = parts[0];
            const filePath = join(__dirname, "packages", pluginName, "src", parts.slice(1).join("/"));

            if (existsSync(filePath) && filePath.endsWith(".ts")) {
              server.transformRequest(filePath).then((result) => {
                if (result) {
                  res.setHeader("Content-Type", "application/javascript");
                  res.end(result.code);
                } else {
                  next();
                }
              });
              return;
            }
          }

          for (const plugin of pluginPublicDirs) {
            if (url.startsWith(`/plugins/${plugin.name}/`)) {
              const filename = url.replace(`/plugins/${plugin.name}/`, "");
              const filePath = join(plugin.path, filename);

              if (existsSync(filePath)) {
                const content = readFileSync(filePath);
                const contentType = lookup(filePath) || "application/octet-stream";
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
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
