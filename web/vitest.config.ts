import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Configuración de pruebas para el cambio modo-caja-offline.
// Entorno happy-dom (no node) porque colaOffline usa IndexedDB, que no existe
// en node; se polyfill con fake-indexeddb/auto en src/test/setup.ts.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
