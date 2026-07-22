# Proposal: SKU Configurable + Fuzzy Matching

## Status: PENDING (exploration phase)

## Summary
Implement configurable SKU generation per company and fuzzy matching to prevent duplicate products.

## Scope
- empresa_configuracion_sku table
- Plantilla-based SKU generation (categoria_secuencial, solo_secuencial, prefijo_fijo_secuencial)
- Atomic counter mechanism (no race conditions)
- SKU read-only when auto-generation is active
- Fuzzy matching with pg_trgm for duplicate prevention
- Unique constraint on SKU per company
