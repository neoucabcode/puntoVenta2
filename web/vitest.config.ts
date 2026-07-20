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
    // Forzar supabase=null en tests: sin .env real el cliente es null (modo
    // offline-safe). Si hubiera un .env local con credenciales, createClient
    // intentaria iniciar el realtime client y fallaria en el runner.
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
    },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
