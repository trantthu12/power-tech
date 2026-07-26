import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // The entry chunk is mostly the baked dataset JSON (must ship); real code is
    // already split per route + per vendor below.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Split heavy libs into their own chunks so they cache independently
        // and don't bloat the entry bundle.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          recharts: ["recharts"],
          leaflet: ["leaflet", "react-leaflet"],
        },
      },
    },
  },
});
