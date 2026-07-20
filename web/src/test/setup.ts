// Polyfill de IndexedDB para el entorno de pruebas (happy-dom no lo incluye).
// Debe importarse antes que cualquier módulo que use indexedDB.
import 'fake-indexeddb/auto'
