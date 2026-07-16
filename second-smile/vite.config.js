import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom", "react-redux"],
  },
  server: {
    proxy: {
      "/api": {
        target: "https://dental-clinic-backend-4yfs.onrender.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
