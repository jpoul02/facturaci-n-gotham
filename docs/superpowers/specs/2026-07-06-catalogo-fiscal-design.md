# Diseño: Catálogo Fiscal (v1)

## Contexto

Noveno y último sub-proyecto pendiente de GOTHAM (los 6 módulos originales quedan todos cubiertos tras este). Hoy el IVA es un porcentaje global fijo (`IVA_PCT = 13` en `src/lib/calculos.ts`), aplicado sobre el subtotal completo de cualquier venta — no existe el concepto de "tipo de impuesto" como catálogo administrable, aunque el ER original lo contemplaba.

Sigue sin backend real, sin tests automatizados para comportamiento nuevo (mismo criterio desde Auth+Roles en adelante) — **excepción**: `calculos.test.ts` tiene 2 tests existentes que rompen por el cambio de firma de `calcularTotalesVenta` y deben corregirse (no son tests nuevos, son tests preexistentes que hay que mantener en verde).

## Alcance

- **CRUD completo de Tipos de Impuesto** (crear/editar/activar-desactivar, mismo patrón que Productos/Usuarios — sin borrado real).
- **Cálculo de impuesto por línea**, no global: cada producto tiene un tipo de impuesto asignado; cada línea de venta "snapshotea" el porcentaje al momento de agregarse al carrito (mismo criterio ya usado para `precioUnitario`: si el admin cambia el tipo de impuesto de un producto después, no afecta ventas ya creadas).
- Se sigue auditando (mismo patrón que Productos/Usuarios): crear/editar/activar/desactivar tipo de impuesto son 4 acciones nuevas en el log de Auditoría.

## Modelo de datos

`src/lib/types.ts`:

```ts
export interface TipoImpuesto {
  id: string;
  nombre: string;
  porcentaje: number;
  activo: boolean;
}
```

`Producto` gana `tipoImpuestoId: string` (requerido — todo producto tiene un tipo de impuesto). `LineaVenta` gana `impuestoPct: number` (snapshot, igual que `precioUnitario`).

## Cálculo (`src/lib/calculos.ts`)

`calcularSubtotalLinea` no cambia (sigue sin necesitar el impuesto). `calcularTotalesVenta` pasa de "un % global sobre el subtotal total" a "sumar el impuesto de cada línea individualmente" (subtotal de línea × su propio `impuestoPct`). Esto permite mezclar líneas gravadas y exentas en la misma venta con el cálculo correcto. `IVA_PCT = 13` se mantiene como constante (valor semilla del tipo "Gravado"), ya no se usa directamente dentro de `calcularTotalesVenta`.

## Semilla (`src/lib/mock-data/seed.ts`)

3 tipos de impuesto estándar de El Salvador: "Gravado" (13%), "Exento" (0%), "No sujeto" (0%). Los 6 productos semilla existentes quedan asignados a "Gravado" (ninguno cambia de comportamiento fiscal respecto a hoy).

## UI

**Cat álogos** (`/catalogos`, ya existente): gana un selector de pestañas simple ("Productos" | "Tipos de impuesto") arriba de la tabla. La pestaña de Productos es la que ya existe (sin cambios de layout, solo el nuevo campo tipo-impuesto en su diálogo). La pestaña de Tipos de impuesto es una tabla nueva (Nombre, Porcentaje, Activo, Acciones) con su propio diálogo crear/editar, mismo patrón que Productos/Usuarios.

**`ProductoDialog`**: nuevo campo "Tipo de impuesto" — un combobox con búsqueda (Popover+Command, mismo patrón que `ClienteCombobox`), NO un toggle de botones — a diferencia de Rol/MetodoPago (uniones fijas de 3 valores), Tipos de Impuesto es una lista administrable que puede crecer, calza exactamente en la regla existente del proyecto de "combobox para selects que filtran por ID de entidad".

**Recibo y detalle de venta**: la línea "IVA (13%)" del recibo pasa a decir genéricamente "Impuesto" (ya no hay un único porcentaje fijo que mostrar si una venta mezcla tipos).

## Fuera de scope (v1)

Reglas de exención por cliente (ej. cliente exento compra producto gravado), reportes desglosados por tipo de impuesto, más de un tipo de impuesto por línea, edición del porcentaje de un tipo de impuesto ya usado en ventas históricas afectando esas ventas (no aplica — el snapshot en `LineaVenta` ya lo previene por diseño).

## Manejo de errores

Combobox de tipo de impuesto sin selección bloquea "Guardar" en `ProductoDialog` (mismo patrón que campos requeridos existentes). Tipo de impuesto sin nombre o porcentaje inválido (no numérico o fuera de 0-100) bloquea "Guardar" en su propio diálogo, mismo patrón que `ProductoDialog`'s validación de precio.

## Verificación (sin tests automatizados para comportamiento nuevo)

`calculos.test.ts` corregido y en verde (2 tests existentes actualizados con `impuestoPct` explícito, mismos valores esperados). Manual con Playwright: como admin, crear un tipo de impuesto "Exento" (0%) desde `/catalogos`. Crear un producto nuevo asignado a "Exento". Iniciar una venta con ese producto y otro gravado (13%), confirmar que el recibo calcula el impuesto combinado correctamente (solo la línea gravada aporta impuesto). Confirmar el evento de auditoría "Tipo de impuesto creado" aparece en `/auditoria`. `npm run build` sin errores, `npm test` en verde (8 archivos, tests de `calculos.test.ts` actualizados, resto sin cambios).
