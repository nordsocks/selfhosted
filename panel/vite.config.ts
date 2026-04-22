import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    {
      name: "selfhosted-base-redirect",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url ?? "/";
          if (url.startsWith("/@") || url.startsWith("/__") || url.startsWith("/node_modules")) {
            next();
            return;
          }
          if (!url.startsWith(basePath)) {
            res.writeHead(302, { Location: basePath });
            res.end();
            return;
          }
          next();
        });
      },
    },
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
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      [`${basePath}api`]: {
        target: "http://localhost:8083",
        changeOrigin: true,
        rewrite: (path) => path.replace(new RegExp(`^${basePath.replace(/\/$/, "")}`), ""),
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
