import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5177,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    exclude: ["node_modules/**", "dist/**", "tests/**"],
    setupFiles: "./src/test/setup.js",
  },
});
