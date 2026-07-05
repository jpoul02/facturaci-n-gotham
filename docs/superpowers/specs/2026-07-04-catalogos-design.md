# Diseño: Catálogos — CRUD de Productos (v1)

## Contexto

Cuarto sub-proyecto de GOTHAM, sobre lo ya mergeado en esta rama (POS, Auth+Roles, Anulación con Supervisor). Hoy `productosSeed` es un array estático importado directo en `ventas-context.tsx` — `buscarProductos` filtra ese import, no el `productos` del state (de hecho `productos` en el value del context ni siquiera es stateful, es el mismo array estático re-expuesto). No hay forma de crear, editar, ni activar/desactivar productos desde la UI. Este sub-proyecto arregla eso y agrega la pantalla `/catalogos` para Administrador.

Sigue sin backend real, sin tests automatizados (mismo criterio que los sub-proyectos anteriores — verificación manual con Playwright).

## Fix en `ventas-context.tsx`

- `productos` pasa a ser state (`useState<Producto[]>(productosSeed)`), igual patrón que `clientes`.
- `buscarProductos` filtra sobre el state `productos`, no sobre el import estático `productosSeed` (bug existente que corrige este sub-proyecto de paso).
- Nuevas funciones:
  - `crearProducto(data: Omit<Producto, "id">): Producto` — agrega al state, `activo: true` por default si no se especifica.
  - `actualizarProducto(id: string, data: Partial<Omit<Producto, "id">>): void` — merge parcial sobre el producto existente.
  - `toggleActivoProducto(id: string): void` — invierte el flag `activo`.

Nada de esto rompe `CarritoBuilder` (Task 11 del plan POS) — sigue llamando `buscarProductos(query)` igual, ahora sobre datos que pueden cambiar en runtime.

## Pantalla `/catalogos`

- Solo Administrador. Mismo patrón que `/aprobaciones`: nav item pasa de `enabled: false` ("Pronto") a `enabled: true`, y la página tiene guard propio (redirige a `/` si el rol no es `administrador`, no solo escondido del sidebar).
- Tabla: Código, Nombre, Precio, Tipo, Activo (switch inline, sin confirmación — reversible al toque), Acciones (botón "Editar").
- Botón "+ Nuevo producto" abre un diálogo (mismo patrón visual que `ClienteNuevoDialog`: Dialog + Label + Input + Button `h-10`) con campos nombre, código, precio, tipo. El mismo diálogo sirve para crear y para editar (si se le pasa un producto existente, precarga los campos y llama `actualizarProducto` en vez de `crearProducto`).
- Sin borrado real — solo el toggle de `activo`, consistente con el flag que ya existe (`Cinta métrica 5m (descontinuada)` en el seed).

## Validación de campos

- Nombre y código obligatorios (no vacíos).
- Precio: número positivo (rechaza negativos/cero con mensaje inline, no toast).
- Código: sin validación de unicidad en v1 (YAGNI — el prototipo no tiene volumen real de productos para que choque).

## Fuera de scope (v1)

Catálogo fiscal (tipos de impuesto/exenciones — entidad `CatalogoFiscal` del ER original), historial de cambios de precio, importación masiva, categorías de producto como entidad separada (tipo sigue siendo texto libre).

## Manejo de errores

- Precio inválido (≤0 o no numérico) → mensaje inline en el diálogo, botón Guardar deshabilitado.
- Nombre/código vacío → botón Guardar deshabilitado (mismo patrón que `ClienteNuevoDialog`).
- Vendedor/Supervisor navegando directo a `/catalogos` → redirige a `/`.

## Verificación (sin tests automatizados)

Manual con Playwright: login como Lucía (admin) → `/catalogos` → crear producto nuevo → confirmar que aparece en la tabla → ir a `/ventas/nueva` y confirmar que el producto nuevo aparece en la búsqueda del carrito y se puede agregar → volver a `/catalogos`, editar el producto (cambiar precio) → confirmar que se refleja tanto en la tabla como en el precio que trae al agregarlo en una venta nueva → desactivar el producto → confirmar que en `/ventas/nueva` sigue apareciendo en la búsqueda pero ahora bloqueado con el mensaje "no disponible" existente (comportamiento ya implementado en `CarritoBuilder`, no cambia con este sub-proyecto). Confirmar que Vendedor no puede acceder a `/catalogos` (redirige). `npm run build` sin errores.
