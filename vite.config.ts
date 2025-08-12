import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";
import fg from "fast-glob";

// Tự động lấy các file content script
const contentScripts = fg
  .sync("src/content/*.{ts,tsx}")
  .reduce((entries, file) => {
    const name = path.basename(file, path.extname(file));
    entries[name] = path.resolve(__dirname, file);
    return entries;
  }, {} as Record<string, string>);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: "src/manifest.json",
          dest: ".", // Copy manifest to dist/
        },
        {
          src: "src/assets/img/favicon-v3.png",
          dest: "img", // Copy manifest to dist/
        },
        {
          src: "src/content/data/*.json",
          dest: "./content/data", // Copy manifest to dist/
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        // Main popup
        popup: path.resolve(__dirname, "index.html"),

        // Background
        background: path.resolve(__dirname, "src/background/service_worker.ts"),

        // Auto-import all content scripts
        ...contentScripts,
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "background") {
            return "background/[name].js";
          } else if (Object.keys(contentScripts).includes(chunkInfo.name!)) {
            return "content/[name].js";
          } else {
            return "[name].js"; // popup, etc.
          }
        },
      },
    },
    outDir: "dist",
    emptyOutDir: true,
  },
});
