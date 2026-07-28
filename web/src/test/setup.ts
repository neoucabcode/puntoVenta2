// Polyfill de IndexedDB para el entorno de pruebas (happy-dom no lo incluye).
// Debe importarse antes que cualquier módulo que use indexedDB.
import 'fake-indexeddb/auto'
// Matchers de jest-dom: toBeInTheDocument, toBeDisabled, etc.
import '@testing-library/jest-dom/vitest'
