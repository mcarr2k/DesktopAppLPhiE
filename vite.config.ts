import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import path from "node:path";

// `LPHIE_NO_ELECTRON=1` (set by the `dev:web` / `build:web` scripts)
// skips the Electron plugin so the renderer can be built and served
// as a plain SPA for static hosting (Vercel / Netlify / GitHub Pages /
// S3, etc.). HashRouter means no rewrite rules are needed on the host.
const skipElectron = process.env.LPHIE_NO_ELECTRON === "1";

export default defineConfig({
  // "./" is required for Electron's file:// loader. Static hosts also
  // accept it, so the same build works for both targets.
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    react(),
    ...(skipElectron
      ? []
      : [
          electron({
            main: {
              entry: "electron/main.ts",
              vite: {
                build: {
                  outDir: "dist-electron",
                  rollupOptions: {
                    external: ["electron", "electron-store"],
                  },
                },
              },
            },
            preload: {
              input: path.join(__dirname, "electron/preload.ts"),
              vite: {
                build: {
                  outDir: "dist-electron",
                  rollupOptions: {
                    external: ["electron"],
                  },
                },
              },
            },
            renderer: {},
          }),
        ]),
  ],
  server: {
    port: 5173,
  },
});
