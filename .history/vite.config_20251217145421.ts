import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // split core React runtime
          react: ["react", "react-dom"],
          // Supabase client in its own chunk
          supabase: ["@supabase/supabase-js"],
          // icon & UI helpers (adjust to what you actually use)
          ui: ["lucide-react"],
          // add any other heavy libs here, e.g. charts:
          // charts: ["recharts", "chart.js"],
        },
      },
    },
    // raise warning threshold for large chunks (optional)
    chunkSizeWarningLimit: 2000, // in kB → 2 MB
  },
}));