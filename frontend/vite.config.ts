import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy /api → backend durante o desenvolvimento (npm run dev).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
