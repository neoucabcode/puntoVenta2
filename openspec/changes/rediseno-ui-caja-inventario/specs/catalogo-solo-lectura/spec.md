# Delta for catalogo-solo-lectura

## MODIFIED Requirements

#### Requirement: Catálogo de solo-lectura permanente

<!-- slice: 1 -->

El sistema DEBE restringir `CatalogoPage` a solo-lectura de forma **permanente**, sin importar el
estado de la caja, ocultando cualquier control de creación, edición, borrado y venta. La
restricción ya no depende de `sesion_caja` ni de la bandera `soloLectura = cajaHabilitada && !cajaAbierta`.

(Previously: la restricción era condicional — solo-lectura solo cuando no había caja abierta.)

##### Scenario: Catálogo siempre solo lectura

- **Given** cualquier dispositivo (con o sin caja abierta, caja habilitada o no)
- **When** el usuario abre el catálogo
- **Then** el sistema muestra los productos en modo consulta
- **And** oculta "Crear", "Editar", "Borrar" y "Vender"

##### Scenario: Admin no edita desde catálogo

- **Given** un usuario con rol admin
- **When** abre el catálogo
- **Then** también ve modo solo lectura (la edición vive en `/inventario`)
- **And** no se renderiza `ProductoForm` ni el botón "Vender"

##### Scenario: Lectura offline del catálogo

- **Given** el dispositivo está sin internet
- **When** el usuario abre el catálogo
- **Then** el sistema sirve el catálogo desde caché local (IndexedDB/último sync)
- **And** mantiene modo solo lectura, sin ofrecer venta

#### Requirement: Eliminación de componentes de edición del catálogo

<!-- slice: 1 -->

El sistema NO DEBE renderizar `ProductoForm` ni el botón "Vender" (`registrarVentaOffline`) dentro
de `CatalogoPage`, y DEBE eliminar la bandera `soloLectura` de ese componente. La edición de
productos se mueve a `InventarioPage`.

(Previously: `CatalogoPage` embebía `ProductoForm` y botón "Vender" condicionados por `soloLectura`.)

##### Scenario: Componentes ausentes en catálogo

- **Given** `CatalogoPage` montado
- **When** se inspecciona el DOM
- **Then** no existen nodos de `ProductoForm` ni botón "Vender"
- **And** `CatalogoPage` no referencia la variable `soloLectura`
