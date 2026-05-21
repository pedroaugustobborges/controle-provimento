import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// Plugin que gera dist/version.json no final do build
function versionJsonPlugin(): Plugin {
  return {
    name: "version-json",
    apply: "build",
    closeBundle() {
      const version = Date.now().toString();
      const buildHash = `${version}-${Math.random().toString(36).slice(2, 10)}`;
      const outDir = path.resolve(__dirname, "dist");
      try {
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(
          path.join(outDir, "version.json"),
          JSON.stringify({ version, buildHash, builtAt: new Date().toISOString() }, null, 2),
        );
        // eslint-disable-next-line no-console
        console.log(`[version-json] dist/version.json gerado: ${buildHash}`);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[version-json] falha ao gerar version.json", err);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    versionJsonPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
