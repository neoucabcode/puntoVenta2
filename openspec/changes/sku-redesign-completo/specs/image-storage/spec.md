# Delta for Image Storage

## MODIFIED Requirements

### Requirement: Image Naming Convention

Product images MUST be stored with the product's UUID (`producto_id`) as the primary filename component, with extension `.webp`. SKU is NOT used in the image path.

(Previously: Images were stored with SKU value as filename, e.g., `{empresa_id}/FER-0012.jpg`.)

#### Scenario: Image upload with UUID-based path

- GIVEN a product with `producto_id = 'a1b2c3d4'` and `empresa_id = 'emp-001'`
- WHEN the user uploads a product image
- THEN the image is stored as `emp-001/a1b2c3d4.webp` and `imagen_url` points to that path

#### Scenario: Image extension always webp

- GIVEN a user uploads a `.jpg` image
- WHEN the upload is processed
- THEN the stored file uses `.webp` extension regardless of original format

### Requirement: SKU-Scoped Storage Path

Images MUST be stored under a path that includes the `empresa_id` to maintain multi-tenant isolation. The path MUST use `producto_id` (UUID) as the filename.

(Previously: Path used SKU as filename: `{empresa_id}/{sku}.webp`.)

#### Scenario: Multi-tenant image isolation

- GIVEN two empresas `emp-001` and `emp-002` each have a product
- WHEN images are uploaded for each product
- THEN the storage paths are `emp-001/{producto_id_a}.webp` and `emp-002/{producto_id_b}.webp`, and neither empresa can access the other's image

#### Scenario: Same SKU different products

- GIVEN two products in different empresas both happen to have SKU `FER-0012`
- WHEN images are uploaded
- THEN each product's image is stored under its own `empresa_id/producto_id.webp` path with no conflict

### Requirement: Delete Cleanup

When a product is deleted, its image file MUST also be removed from storage to prevent orphaned files.

(Previously: Image path was SKU-based. Now path is UUID-based — cleanup logic targets `empresa_id/producto_id.webp`.)

#### Scenario: Product deletion with image

- GIVEN a product with `producto_id = 'a1b2c3d4'` and an image at `emp-001/a1b2c3d4.webp`
- WHEN the product is permanently deleted by an admin
- THEN the image file is removed from storage and `imagen_url` is no longer accessible

## REMOVED Requirements

### Requirement: Image Rename on SKU Regeneration

(Reason: Images are stored by UUID, not SKU. SKU changes never affect image paths.)
(Migration: None — behavior removed by design.)

### Requirement: Default Extension on Missing Original

(Reason: With UUID-based paths, this scenario no longer applies — SKU changes don't trigger file operations.)
(Migration: None — behavior removed by design.)

## ADDED Requirements

### Requirement: UUID-Based Image Backfill

The system MUST provide a backfill script to migrate existing SKU-based images to UUID-based paths. The script MUST be idempotent — safe to run multiple times without data loss.

#### Scenario: Backfill moves image to new path

- GIVEN a product with `producto_id = 'a1b2c3d4'` and an image at `emp-001/FER-0012.webp`
- WHEN the backfill script runs
- THEN the image is copied to `emp-001/a1b2c3d4.webp`, the copy is verified, and the old path is deleted

#### Scenario: Backfill idempotent — already migrated

- GIVEN a product already has an image at `emp-001/a1b2c3d4.webp`
- WHEN the backfill script runs again
- THEN no file operations occur and the script reports "already migrated"

#### Scenario: Backfill handles missing image

- GIVEN a product with `producto_id = 'a1b2c3d4'` and no image (`imagen_url` is null)
- WHEN the backfill script runs
- THEN no file operations occur and the product is skipped

### Requirement: Image Lifecycle Decoupled from SKU

The system MUST NOT perform any file operations (rename, move, copy) when a product's SKU changes. Image paths are determined solely by `empresa_id` and `producto_id`.

#### Scenario: SKU regeneration does not affect image

- GIVEN a product with an image at `emp-001/producto_id.webp` and SKU `FER-0012`
- WHEN the SKU is regenerated to `FER-0013`
- THEN the image remains at `emp-001/producto_id.webp` and `imagen_url` is unchanged

#### Scenario: Category change does not affect image

- GIVEN a product with an image at `emp-001/producto_id.webp`
- WHEN the product's category is changed
- THEN the image path remains `emp-001/producto_id.webp`
