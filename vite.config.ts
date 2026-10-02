import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@shared": path.resolve(__dirname, "shared") } },
  server: { proxy: { "/api": "http://localhost:4000" } },
  build: { chunkSizeWarningLimit: 2000 },
});
