import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Mirror production routing: /mcp is served by the MCP container.
    proxy: { "/mcp": "http://localhost:3001" },
  },
  build: {
    outDir: "dist",
    rollupOptions: { input: "index.html" },
  },
});
