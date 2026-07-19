# Plan de acción: UI del catálogo y base para módulos futuros

## Objetivo
Mejorar el aprovechamiento del espacio en pantalla del catálogo, unificar el comportamiento entre vista de cuadrícula y vista de lista, y dejar una base visual consistente para que otros módulos puedan reutilizar el mismo patrón.

## Problemas detectados

### 1. Aprovechamiento del espacio
- La vista del catálogo no estaba usando correctamente la altura disponible del contenedor principal.
- El contenido podía quedar con scroll innecesario o con áreas vacías.
- El layout general del shell estaba limitado por un `overflow` poco consistente entre el layout principal y el contenido del catálogo.

### 2. Sidebar y comportamiento de scroll
- El sidebar estaba siendo tratado como un elemento que podía “quedarse” en una zona desplazada del layout.
- El contenido principal no estaba encerrando el flujo de scroll de forma consistente.
- Los iconos y acciones del sidebar podían verse afectados por el comportamiento de altura del contenedor del contenido.

### 3. Diferencias entre vista de grid y vista de lista
- La vista de cuadrícula y la vista de lista estaban usando contenedores de scroll ligeramente distintos.
- Esto generaba desigualdad visual y de comportamiento al navegar entre vistas.
- La tabla de lista no estaba aprovechando la altura disponible del mismo modo que la grilla.

### 4. Fragilidad del diseño
- El catálogo estaba bien visualmente, pero su layout dependía demasiado de comportamientos generales del contenedor.
- El diseño no estaba suficientemente normalizado para que otros módulos repitan el patrón con facilidad.

## Estrategia adoptada
1. Ajustar el contenedor principal para que el layout complete la altura de pantalla completa.
2. Reducir los puntos de scroll innecesarios y fijar una estructura más limpia para el contenido interno.
3. Hacer que el contenido del catálogo se adapte a un área de trabajo única, con un cuerpo interno que crece y se contrae correctamente.
4. Unificar el comportamiento del área de resultados entre grilla y lista.
5. Dejar el diseño del catálogo como base visual para futuros módulos.

## Cambios aplicados

### Layout principal
- Se ajustó el shell principal para usar altura completa y evitar que el body o el contenedor raíz generen scroll extra.
- Se normalizó el comportamiento del `content` para que sea un contenedor interno con altura controlada.

### Catálogo
- Se estableció una estructura más consistente para el área de resultados.
- La grilla y la lista ahora comparten mejor la misma lógica de alto disponible.
- La barra superior del catálogo quedó más estable dentro del flujo visual.

### Tabla reutilizable
- Se ajustó la tabla de datos para que su cuerpo scrolleable ocupe el alto del contenedor padre en lugar de depender de una altura fija artificial.
- Esto mejora el comportamiento de la vista de lista y evita desalineaciones visuales.

## Próximos pasos recomendados

### Fase 1 — Pulido visual del catálogo
- Revisar el tamaño de las tarjetas para que se mantengan consistentes en ancho/alto.
- Ajustar la densidad de padding en toolbar, cards y acciones.
- Alinear mejor los estados de stock y las etiquetas semánticas.
- Definir una altura mínima y máxima más estable para la grilla.

### Fase 2 — Unificar patrón para futuros módulos
- Extraer el layout base de catálogo en un patrón reutilizable de “workspace”.
- Preparar un componente base para:
  - toolbar superior
  - área de contenido con scroll interno
  - estado vacío
  - carga
  - acciones rápidas

### Fase 3 — Mejoras de UX
- Añadir estados de carga más claros por fila o por bloque.
- Añadir transiciones suaves entre vistas de grilla y lista.
- Mejorar el comportamiento del scroll infinito y el empty state.
- Garantizar que la interfaz sea usable en pantallas pequeñas y medianas.

### Fase 4 — Preparación para módulos futuros
- Pos: usar el mismo shell, toolbar y área de resultados.
- Compras: reutilizar el mismo diseño de tabla/lista.
- Inventario: usar las mismas tarjetas, agrupaciones y estados visuales.

## Riesgos a monitorear
- Que el diseño siga dependiendo demasiado de reglas muy específicas de CSS en vez de un sistema más modular.
- Que cada módulo termine recreando su propia estructura si no se define un patrón base.
- Que el scroll interno siga siendo inconsistente en pantallas con altura variable.

## Criterios de éxito
- El catálogo aprovecha bien el espacio vertical y horizontal.
- La grilla y la lista se ven y se comportan de forma consistente.
- El sidebar no genera problemas visuales ni de layout.
- El patrón se puede reutilizar en otros módulos sin reescribir todo el CSS.
