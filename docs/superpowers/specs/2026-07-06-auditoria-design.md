# Diseño: Auditoría del Sistema (v1)

## Contexto

Octavo sub-proyecto de GOTHAM, en `master`. Cierra RF-A03 (Auditoría), el último requisito del rol Administrador pendiente de los diagramas originales — el `LogAuditoria` del ER nunca se había tocado, explícitamente diferido en la spec de Reportes ("Auditoría/logs del sistema... queda explícitamente fuera de scope").

Sigue sin backend real, sin tests automatizados (mismo criterio desde Auth+Roles en adelante).

## Alcance: qué se audita

Solo acciones **directamente disparadas por un clic de usuario** — no transiciones asíncronas del sistema (ej. la resolución simulada de DTE tras 1200ms NO se audita; el clic que la originó, "Venta creada" o "Reintento de emisión", sí). Esto mantiene el alcance chico y evita instrumentar código async con complejidad de cierre innecesaria para un prototipo.

Eventos auditados (16 acciones fijas):
- Sesión: `login`, `logout`
- Clientes: `cliente_registrado`
- Productos: `producto_creado`, `producto_actualizado`, `producto_activado`, `producto_desactivado`
- Ventas: `venta_creada`, `anulacion_solicitada`, `anulacion_aprobada`, `anulacion_rechazada`, `emision_reintentada`
- Usuarios: `usuario_creado`, `usuario_actualizado`, `usuario_activado`, `usuario_desactivado`

Cada evento registra: fecha (ISO), quién lo hizo (`usuarioId`/`usuarioNombre`, `null`/"Sistema" si no aplica), la acción (enum fijo), y un detalle en texto libre legible (ej. `Usuario "Carlos Reyes" desactivado`).

## Arquitectura: `AuditoriaProvider` como contexto raíz

Nuevo `src/lib/auditoria-context.tsx`, mismo patrón que los contextos existentes: `useState<EventoAuditoria[]>([])`, `registrarEvento` que prepende (más nuevo primero). Se monta en `src/app/layout.tsx` como el provider más externo, envolviendo a `AuthProvider` (que a su vez envuelve a `VentasProvider`):

```
AuditoriaProvider
  AuthProvider
    VentasProvider
      {children}
```

Esto permite que tanto `AuthProvider` como `VentasProvider` llamen a `useAuditoria()` internamente para registrar eventos, sin que ninguna página o componente existente tenga que pasar un "actor" explícito en cada llamada — cero cambios en los ~15 call-sites de mutadores ya existentes en toda la app.

**Problema real a resolver:** 5 archivos de test (`ventas-context.test.tsx`, `venta-detail-client.test.tsx`, `cliente-nuevo-dialog.test.tsx`, `carrito-builder.test.tsx`, `pos-flow.test.tsx`) renderizan `<VentasProvider>` standalone, sin `AuthProvider` ni `AuditoriaProvider` como ancestros. Si `VentasProvider` llama a los hooks `useAuth()`/`useAuditoria()` normales (que tiran error si no hay Provider ancestro), los 5 tests truenan en render.

**Solución:** dos hooks "opcionales" que no tiran error, usados únicamente dentro de `VentasProvider`:

```ts
// en auditoria-context.tsx
export function useAuditoriaOpcional() {
  return useContext(AuditoriaContext); // puede ser null
}

// en auth-context.tsx
export function useAuthOpcional() {
  return useContext(AuthContext); // puede ser null
}
```

`VentasProvider` los usa así: si no hay Provider ancestro (como en los 5 tests), ambos devuelven `null`, el actor se trata como "Sistema"/`null` y `registrarEvento` simplemente no se llama (optional chaining) — cero cambios de comportamiento para los tests existentes. `AuthProvider`, en cambio, SÍ usa el `useAuditoria()` normal (que tira error) porque ningún test lo renderiza standalone (confirmado por grep) — siempre corre dentro del árbol real de la app, donde `AuditoriaProvider` ya es ancestro garantizado.

## Detalle de logging por mutador

Los mutadores que necesitan el valor "anterior" para el mensaje (ej. `toggleActivoUsuario` necesita saber si estaba activo antes de togglear) leen el estado directamente en el cuerpo de la función (no dentro del callback funcional de `setState`), para evitar que Strict Mode de React invoque el logging dos veces en desarrollo (el callback funcional de `setState` puede invocarse 2 veces en dev bajo Strict Mode; leer el estado por closure normal, fuera del updater, no tiene ese problema). Esto cambia el arreglo de dependencias de esos `useCallback` (ahora incluyen el estado que leen), consistente con el patrón ya usado en `buscarProductos`/`buscarClientes` (que también dependen del estado que leen).

## Pantalla `/auditoria`

- Visible solo para Administrador (mismo patrón de guard que `/catalogos`/`/seguridad`).
- Tabla de solo lectura: Fecha, Usuario, Acción (vía `ACCION_LABELS`), Detalle. Orden: más reciente primero (ya viene así de `eventos`, no se re-ordena).
- Sin filtros, sin paginación, sin exportar — igual criterio de YAGNI que Reportes v1 (fuera de scope, ver abajo).
- Nuevo ítem de sidebar "Auditoría" (ícono `History`), rol `["administrador"]`, `enabled: true` desde el día uno (no hay estado "Pronto" previo para este ítem, es nuevo).

## Fuera de scope (v1)

Auditar la transición async de emisión DTE (autorizada/error_dte tras el `setTimeout`) — solo se audita el clic que la disparó. Filtros de fecha/usuario/acción, exportar a CSV/PDF, paginación, purga/retención de eventos viejos, persistencia entre reloads (los eventos viven en memoria como el resto del prototipo — se pierden al recargar la página).

## Manejo de errores

No aplica — es un log de solo lectura sin inputs de usuario ni mutaciones propias. El único caso a manejar es "sin eventos todavía" (estado inicial antes de cualquier acción), que muestra un texto simple en vez de una tabla vacía.

## Verificación (sin tests automatizados)

Manual con Playwright: login como Ana (vendedor) → confirmar evento `login` no visible aún (Ana no tiene acceso a `/auditoria`). Crear una venta, solicitar anulación. Logout. Login como Carlos (supervisor), aprobar la anulación, logout. Login como Lucía (admin) → `/auditoria` → confirmar aparecen, en orden reciente-primero: login de Lucía, aprobación de anulación por Carlos, logout de Carlos, solicitud de anulación por Ana, venta creada por Ana, login de Ana — con nombres de usuario y detalles correctos. Crear un producto y un usuario nuevo desde Catálogos/Seguridad, confirmar que ambos eventos aparecen. `npm run build` sin errores, `npm test` sigue en 8 archivos/31 tests (los 5 archivos que renderizan `VentasProvider` standalone deben seguir pasando sin cambios, gracias a los hooks opcionales).
