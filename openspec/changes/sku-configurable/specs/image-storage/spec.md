# Image Storage Specification

## Purpose

Define the naming convention and lifecycle management for product images tied to SKU values, ensuring deterministic paths and consistent renaming when SKUs change.

## Requirements

### Requirement: Image Naming Convention

Product images MUST be stored with the SKU value as the primary filename component, preserving the original file extension.

#### Scenario: Image upload with auto-generated SKU

- GIVEN a product with SKU `FER-0012` is created
- WHEN the user uploads a product image `taladro_original.jpg`
- THEN the image is stored as `{storage_path}/FER-0012.jpg` and `imagen_url` is set to the public URL of that path

#### Scenario: Image upload with manual SKU

- GIVEN a product with a manually entered SKU `CUSTOM-001` is created
- WHEN the user uploads `producto.png`
- THEN the image is stored as `{storage_path}/CUSTOM-001.png`

### Requirement: SKU-Scoped Storage Path

Images MUST be stored under a path that includes the `empresa_id` to maintain multi-tenant isolation.

#### Scenario: Multi-tenant image isolation

- GIVEN two empresas `abc-123` and `xyz-789` both have a product with SKU `FER-0012`
- WHEN images are uploaded for each
- THEN the storage paths are `abc-123/FER-0012.jpg` and `xyz-789/FER-0012.jpg` respectively, and neither empresa can access the other's image

### Requirement: Image Rename on SKU Regeneration

When an admin regenerates a product's SKU, the system MUST rename the existing image file to match the new SKU and update `imagen_url`.

#### Scenario: Regeneration with existing image

- GIVEN a product has SKU `FER-0012` and an image stored at `empresa_id/FER-0012.jpg`
- WHEN the admin regenerates the SKU to `FER-0013`
- THEN the image is renamed to `empresa_id/FER-0013.jpg`, the old file is deleted, and `imagen_url` points to the new path

#### Scenario: Regeneration without image

- GIVEN a product has SKU `FER-0012` and no image uploaded (`imagen_url` is null)
- WHEN the admin regenerates the SKU to `FER-0013`
- THEN no file operation occurs and `imagen_url` remains null

### Requirement: Image Upload Validation

The system MUST validate uploaded files against allowed image types and a maximum size before persisting.

#### Scenario: Valid image upload

- GIVEN a user uploads a file of type `image/jpeg` with size 1.2 MB
- WHEN the upload is processed
- THEN the file is accepted and stored with the SKU-based naming convention

#### Scenario: Invalid file type rejected

- GIVEN a user attempts to upload a `.pdf` file
- WHEN the upload is processed
- THEN the system rejects the file and displays "Formato no permitido. Use JPG, PNG o WebP."

#### Scenario: File too large rejected

- GIVEN a user uploads a 15 MB image file
- WHEN the upload is processed
- THEN the system rejects the file and displays "El archivo excede el tamaño máximo de 5 MB."

### Requirement: Default Extension on Missing Original

When a product has no image and the SKU changes, the system MUST not create a placeholder file. Only actual uploads trigger file storage.

#### Scenario: SKU change before image upload

- GIVEN a product is created with SKU `FER-0012` and no image
- WHEN the SKU is later regenerated to `FER-0013`
- THEN no file is created and `imagen_url` remains null

### Requirement: Delete Cleanup

When a product is deleted, its image file MUST also be removed from storage to prevent orphaned files.

#### Scenario: Product deletion with image

- GIVEN a product with SKU `FER-0012` and an image at `empresa_id/FER-0012.jpg`
- WHEN the product is permanently deleted by an admin
- THEN the image file is removed from storage and `imagen_url` is no longer accessible
