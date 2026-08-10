import tailwindcss from "@tailwindcss/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import * as path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), tanstackRouter(), react()],
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(__dirname, "src") }],
  },
  build: {
    outDir: "dist/dashboard",
    assetsDir: "assets/",
    rollupOptions: {
      output: {
        // Route/module chunks are also often named "index-*" (many route folders have
        // an index.tsx), which collides with the real entry chunk in size-limit's glob
        // (package.json's "size-limit" config) — give the entry a distinct prefix.
        entryFileNames: "assets/main-[hash].js",
      },
    },
  },
  base: "/dashboard/",
});
