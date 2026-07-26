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
    rollupOptions: {
      output: {
        // Split heavy libs into their own chunks so they cache independently
        // and don't bloat the entry bundle.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          echarts: ["echarts", "echarts-for-react"],
          recharts: ["recharts"],
          leaflet: ["leaflet", "react-leaflet"],
        },
      },
    },
  },
});
