import { fileURLToPath } from 'node:url';
import type { PluginOption } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// host: true expone el front en la red local. El proxy manda /api y el WebSocket al api-gateway,
// así el navegador de cualquier compañero solo necesita hablar con este puerto.
// API_URL permite apuntar a otro gateway (p. ej. una copia de pruebas en otros puertos).
const api = process.env.API_URL ?? 'http://localhost:3001';

export default defineConfig({
  // Los plugins se tipan contra el vite de la raíz (lo usa vitest); en runtime es el mismo contrato.
  plugins: [react(), tailwindcss()] as unknown as PluginOption[],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': api,
      '/socket.io': { target: api, ws: true },
    },
  },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/shared/utils/test-setup.ts'] },
});
