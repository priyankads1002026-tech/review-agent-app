import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Runs the dev server on port 3000 to match the backend's CORS origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
});
