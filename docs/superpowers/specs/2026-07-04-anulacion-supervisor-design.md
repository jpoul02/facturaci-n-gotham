# Diseño: Anulación con Aprobación de Supervisor (v1)

## Contexto

Tercer sub-proyecto de GOTHAM. Los primeros dos ya están implementados y mergeados en esta rama: flujo POS completo (`docs/superpowers/specs/2026-07-04-pos-flujo-venta-design.md`) y Autenticación + Roles (`docs/superpowers/specs/2026-07-04-auth-roles-design.md`). Hoy, "Solicitar anulación" en el detalle de venta anula la venta al instante (`estado → "anulada"` directo) — el diagrama de actividad original del usuario muestra que el Vendedor solicita y un Supervisor aprueba o rechaza. Este sub-proyecto activa ese flujo.

Sigue sin backend real, datos mock, sin tests automatizados (mismo criterio que el sub-proyecto de auth — usuario pidió velocidad, verificación manual con Playwright).

## Cambio en el modelo de estados

El tipo `EstadoVenta` ya incluye `"anulacion_solicitada"` — quedó reservado sin usar desde el sub-proyecto POS original. Este sub-proyecto lo activa:

- `solicitarAnulacion(ventaId, motivo)` — deja de poner `estado: "anulada"` directo. Ahora pone `estado: "anulacion_solicitada"` y guarda `motivoAnulacion`. (Sin cambio en quién puede llamar esto — cualquier usuario logueado, igual que hoy. Asociar la venta a un vendedor específico [`vendedorId`] sigue fuera de scope.)
- `aprobarAnulacion(ventaId)` (nueva) — `anulacion_solicitada → anulada`.
- `rechazarAnulacion(ventaId)` (nueva) — `anulacion_solicitada → autorizada`, limpia `motivoAnulacion` (la venta queda como si nunca se hubiera solicitado la anulación).

`StatusBadge` ya renderiza `anulacion_solicitada` como pill (no sello) — correcto sin cambios, porque es un estado provisional, no respaldado todavía por ninguna autoridad.

## Pantalla nueva: `/aprobaciones`

Solo visible y accesible para Supervisor y Administrador:

- **Sidebar:** nuevo ítem "Aprobaciones" (icono tipo check), **habilitado** (a diferencia de Reportes/Catálogos/Seguridad que siguen "Pronto"), entre "Ventas" y "Reportes". Roles: `["supervisor", "administrador"]`.
- **Guard de página:** si un usuario con rol `vendedor` navega directo a `/aprobaciones` por URL, la página lo redirige a `/` (primer caso de restricción por rol a nivel de página en este proyecto, no solo de visibilidad en el sidebar).
- **Contenido:** lista (cards o tabla, igual criterio visual que `/ventas`) de las ventas en `anulacion_solicitada` — correlativo/id, cliente, monto, motivo, y dos botones: "Aprobar" (llama `aprobarAnulacion`, éxito muestra toast) y "Rechazar" (llama `rechazarAnulacion`, toast). Lista vacía → mensaje "No hay solicitudes pendientes."

## Cambios en el detalle de venta (`/ventas/[id]`)

Cuando `estado === "anulacion_solicitada"`: banner informativo "Anulación solicitada, esperando aprobación del supervisor" + el motivo. Sin botones de acción para el usuario que solicitó (no puede cancelar su propia solicitud en esta versión — YAGNI, se agrega si hace falta después).

## Fuera de scope (v1 de este sub-proyecto)

`vendedorId` en `Venta` / ownership de la solicitud, notificaciones al vendedor cuando se aprueba/rechaza, historial de aprobaciones/auditoría (eso es el sub-proyecto de Reportes), poder cancelar una solicitud ya enviada.

## Manejo de errores

- Lista de `/aprobaciones` vacía → mensaje, no error.
- Intento de aprobar/rechazar una venta que ya cambió de estado (edge case de doble-click) — los botones deben ocultarse en cuanto la venta deja de estar en `anulacion_solicitada` (la lista se recalcula del estado reactivo, así que esto se resuelve solo con re-render, no necesita guard adicional).

## Verificación (sin tests automatizados)

Manual con Playwright: crear una venta autorizada → solicitar anulación → confirmar que pasa a pill "Anulación solicitada" (no sello) → loguearse como supervisor → ver la solicitud en `/aprobaciones` → aprobar → confirmar que la venta pasa a sello "Anulada". Repetir con "Rechazar" y confirmar que vuelve a sello "Autorizada". Confirmar que un usuario con rol vendedor no puede acceder a `/aprobaciones` (redirige). `npm run build` debe compilar sin errores.
