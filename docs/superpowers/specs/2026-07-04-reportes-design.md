# Diseño: Reportes — Métricas Comerciales (v1)

## Contexto

Quinto y último sub-proyecto pendiente de GOTHAM sobre lo ya mergeado en esta rama (POS, Auth+Roles, Anulación con Supervisor, Catálogos). Los diagramas originales del usuario mezclan dos cosas bajo "Reportes": métricas comerciales (RF-S02, Supervisor) y auditoría/logs del sistema (RF-A03, Administrador). Este sub-proyecto cubre solo lo primero — un dashboard de métricas de solo lectura. Auditoría/logs (que requeriría instrumentar todas las mutaciones de la app) queda explícitamente fuera de scope, a decidir como sub-proyecto futuro si hace falta.

Sigue sin backend real, sin tests automatizados (mismo criterio que los sub-proyectos anteriores).

## Pantalla `/reportes`

- Visible para Supervisor y Administrador (nav item pasa de `enabled: false` a `enabled: true`). **Guard de página igual que `/aprobaciones` y `/catalogos`** — un Vendedor que navegue directo por URL debe ser redirigido a `/` (la condición es `usuarioActual.rol === "vendedor"` en vez de comparar contra un solo rol permitido, ya que acá son dos roles los autorizados).
- **Sin cambios al `ventas-context.tsx`** — todo se deriva con `useMemo` sobre `ventas`, `clientes`, `productos` ya expuestos por `useVentas()`. Es una vista de solo lectura, no agrega ninguna función mutadora.

### KPI tiles (reusa `Card`/`CardHeader`/`CardTitle`/`CardContent`, mismo patrón que el Dashboard existente)

- Total de ventas (cuenta de `ventas.length`)
- Total facturado (suma de `total` de ventas en estado `autorizada`)
- Ventas anuladas (cuenta de estado `anulada`)
- Anulaciones pendientes de aprobación (cuenta de estado `anulacion_solicitada`)

### Ventas por estado

Lista de los 7 `EstadoVenta` con su conteo, cada uno mostrado con el `StatusBadge` ya existente (sello/pill) en vez de un gráfico de barras con paleta nueva — son los mismos estados que ya tienen su sistema de color establecido en el resto de la app, coherente con la regla de "el color sigue a la entidad, no se inventa una escala nueva para lo mismo".

### Top clientes y Top productos

Dos listas lado a lado (no gráfico de barras — el volumen de datos del prototipo es demasiado chico para que un gráfico aporte algo sobre una lista simple):

- **Top clientes**: hasta 5 clientes ordenados por monto total facturado (suma de `total` de sus ventas en `autorizada`), nombre + monto.
- **Top productos**: hasta 5 productos ordenados por cantidad total vendida (suma de `cantidad` en `lineas` de ventas `autorizada`), nombre + cantidad.

Si no hay ventas autorizadas todavía, ambas listas muestran "Sin datos todavía." en vez de quedar vacías sin explicación.

## Fuera de scope (v1)

Auditoría/logs del sistema (entidad `LogAuditoria` del ER original), filtros de fecha/rango, exportar a PDF/Excel, gráficos de tendencia en el tiempo, comparativas entre periodos.

## Manejo de errores

No aplica — es una vista derivada de datos ya validados en otros flujos, sin inputs de usuario ni mutaciones. El único caso a manejar es "sin datos todavía" en las listas de top clientes/productos.

## Verificación (sin tests automatizados)

Manual con Playwright: crear 2-3 ventas con distintos clientes/productos y llevarlas a `autorizada`, anular una y dejar otra con anulación solicitada → login como Carlos (supervisor) → `/reportes` → confirmar que los KPI tiles, el desglose por estado, y los top 5 reflejan los datos correctos. Confirmar que Lucía (admin) también puede acceder. Confirmar que Ana (vendedor) no ve el link en el sidebar. `npm run build` sin errores.
