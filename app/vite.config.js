import { defineConfig } from "vite";

// base = Repo-Name für GitHub Pages (Projekt-Pages unter /Ocean-Data-Visualisation/).
// import.meta.env.BASE_URL wird im Code zum Laden der Daten genutzt → dev & prod identisch.
export default defineConfig({
  base: "/Ocean-Data-Visualisation/",
  build: { outDir: "dist", target: "esnext" }, // erlaubt Top-Level-await
});
