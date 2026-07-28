# Catalog Portability Specification

## Purpose

Enable export and import of full product catalogs (categories + products + images) as ZIP archives for tenant onboarding, backup, and data migration between empresas.

## Requirements

### Requirement: Catalog Export as ZIP

The system MUST export an empresa's full catalog as a ZIP file containing `catalogo.json` (categories + products metadata) and an `imagenes/` directory with all product images.

#### Scenario: Successful export

- GIVEN an admin clicks "Exportar catálogo" on the InventarioPage
- WHEN the export completes
- THEN a ZIP file is downloaded containing `catalogo.json` and `imagenes/{producto_id}.webp` for each product with an image

#### Scenario: Export with no products

- GIVEN an empresa has categories but no products
- WHEN the admin exports the catalog
- THEN the ZIP contains `catalogo.json` with categories only and an empty `imagenes/` directory

#### Scenario: Export includes all categories

- GIVEN an empresa has 5 categories
- WHEN the export runs
- THEN `catalogo.json` contains all 5 categories with their `codigo` and `nombre`

### Requirement: Catalog JSON Format

The `catalogo.json` file MUST contain a JSON structure with `categorias` and `productos` arrays. Each product MUST include `sku`, `nombre`, `categoria_codigo`, `precio_bs`, `precio_usd`, and `imagen_filename` (relative path within the ZIP).

#### Scenario: JSON structure validation

- GIVEN a catalog with 3 categories and 10 products
- WHEN `catalogo.json` is generated
- THEN it contains `{"categorias": [...], "productos": [...]}`
- AND each product has all required fields including `imagen_filename` pointing to `imagenes/{producto_id}.webp`

### Requirement: Catalog Import via Drag & Drop

The system MUST support importing a catalog ZIP file via drag & drop onto a modal dialog. Import MUST process categories first (deduplicated by name), then products, then images.

#### Scenario: Successful import

- GIVEN an admin drags a valid catalog ZIP onto the import modal
- WHEN the import completes
- THEN categories are created (skipping existing by name), products are created with their original SKUs, and images are uploaded to the correct UUID-based paths

#### Scenario: Import deduplicates categories by name

- GIVEN the empresa already has a category "Ferretes"
- WHEN the import ZIP contains a category with `nombre = "Ferretes"`
- THEN the existing category is reused and no duplicate is created

#### Scenario: Import preserves original SKUs

- GIVEN the import ZIP contains a product with SKU `FER-0012`
- WHEN the product is created during import
- THEN the product retains SKU `FER-0012` regardless of the empresa's auto-generation settings

#### Scenario: Import with malformed ZIP

- GIVEN a user drags a non-ZIP file or corrupted archive onto the import modal
- WHEN the file is processed
- THEN the modal displays an error: "Archivo ZIP no válido. Verifique el formato."

### Requirement: Import Progress Feedback

The system MUST display per-item progress during catalog import, showing the current step (categories, products, images) and a count of processed items.

#### Scenario: Progress indicator during import

- GIVEN a catalog ZIP with 5 categories, 20 products, and 15 images
- WHEN the import is running
- THEN the modal shows "Importando categorías: 3/5", then "Importando productos: 12/20", then "Importando imágenes: 8/15"

#### Scenario: Partial import failure

- GIVEN 1 of 20 products fails to create (e.g., duplicate SKU constraint)
- WHEN the import completes
- THEN the modal shows "Importados: 19/20 productos. Errores: 1" with details of the failed item
- AND successfully imported items are NOT rolled back

### Requirement: Import Access Control

The system MUST restrict catalog import to admin users only.

#### Scenario: Non-admin blocked from import

- GIVEN a user without admin role is authenticated
- WHEN the user attempts to trigger catalog import
- THEN the import button is not visible or the action returns 403

### Requirement: Export Access Control

The system MUST restrict catalog export to admin users only.

#### Scenario: Non-admin blocked from export

- GIVEN a user without admin role is authenticated
- WHEN the user attempts to trigger catalog export
- THEN the export button is not visible or the action returns 403
