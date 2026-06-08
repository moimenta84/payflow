import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // El frontend se sirve en producción con `vite preview` detrás de nginx.
  // Hay que autorizar explícitamente el dominio público (si no, Vite bloquea la petición).
  preview: {
    host: true,
    port: 5173,
    allowedHosts: ["payflow.ikermartinezdev.com"],
  },
});
