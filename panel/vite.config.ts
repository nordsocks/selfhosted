import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const basePath = process.env.BASE_PATH || "/";
const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 3000;

const apiProxyPath = basePath === "/" ? "/api" : `${basePath}api`;

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      [apiProxyPath]: {
        target: "http://localhost:8083",
        changeOrigin: true,
        rewrite: (p) =>
          basePath === "/" ? p : p.replace(new RegExp(`^${basePath.replace(/\/$/, "")}`), ""),
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
