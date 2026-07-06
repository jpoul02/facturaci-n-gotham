# Diseño: Pagos — Selección de Método (v1)

## Contexto

Sexto sub-proyecto de GOTHAM. El diagrama de secuencia original del flujo de venta incluye un paso "Selecciona método de pago" antes de registrar la transacción, que quedó explícitamente fuera de scope en la spec original del POS (`docs/superpowers/specs/2026-07-04-pos-flujo-venta-design.md`, sección "Fuera de scope"). Este sub-proyecto lo agrega.

Sigue sin backend real, sin tests automatizados (mismo criterio que sub-proyectos anteriores desde Auth+Roles en adelante).

## Alcance

Solo selección de método de pago como metadata de la venta. Sin monto recibido, sin cálculo de cambio, sin validación real de cobro, sin múltiples métodos por venta (split payment). Efectivo/Tarjeta/Transferencia son igual de "simples" en este prototipo — ninguno dispara lógica adicional.

## Modelo de datos

`src/lib/types.ts` — nuevo campo en `Venta`:

```ts
export type MetodoPago = "efectivo" | "tarjeta" | "transferencia";

export interface Venta {
  // ...campos existentes
  metodoPago: MetodoPago;
}
```

Campo requerido (no opcional) — toda venta nueva lo tiene. `ventasSeed` está vacío (`src/lib/mock-data/seed.ts:37`), así que no hay datos existentes que migrar.

`src/lib/ventas-context.tsx` — `crearVenta` cambia de firma:

```ts
crearVenta: (clienteId: string, lineas: LineaVenta[], metodoPago: MetodoPago) => string;
```

El body arma `nuevaVenta` incluyendo `metodoPago` igual que los demás campos. Sin cambios en `resolverEmision`, `solicitarAnulacion`, etc. — el método de pago no afecta el ciclo de vida del estado.

## UI — Nueva venta (`src/app/(app)/ventas/nueva/page.tsx`)

**Stepper** (`src/components/ventas/venta-stepper.tsx`): pasa de 3 a 4 pasos.

```ts
const PASOS = ["Cliente", "Carrito", "Pago", "Confirmar"] as const;
```

**Cálculo de paso** en la página, pasa de 3 a 4 estados:

```ts
const paso = !clienteId ? 1 : lineas.length === 0 ? 2 : !metodoPago ? 3 : 4;
```

**Nuevo componente** `src/components/ventas/metodo-pago-selector.tsx`:

- 3 botones tipo toggle en fila (`variant="outline"`, se marca el seleccionado con `variant="default"` o borde `border-brand-600`), cada uno `h-10`, ícono lucide + label: Banknote "Efectivo", CreditCard "Tarjeta", Landmark "Transferencia".
- Un solo seleccionado a la vez (selección exclusiva, como radio).
- Props: `{ value: MetodoPago | undefined; onChange: (m: MetodoPago) => void }`.
- No es un combobox de búsqueda (regla de "Popover+Command para IDs de entidad" no aplica — son 3 opciones fijas, no una lista de entidades buscable).

Se ubica en `page.tsx` entre la sección "Productos" y el botón "Confirmar venta", con su propio `<label>`.

**Botón "Confirmar venta"** — agrega `metodoPago` a la condición de `disabled`:

```tsx
disabled={!clienteId || lineas.length === 0 || !metodoPago || confirmando}
```

`handleConfirmar` pasa `metodoPago` a `crearVenta(clienteId, lineas, metodoPago)`.

## Visualización

**`ReciboPreview`** (`src/components/ventas/recibo-preview.tsx`) — nueva prop opcional `metodoPago?: MetodoPago`. Si viene, muestra una línea antes del bloque de totales:

```tsx
{metodoPago && (
  <p className="mb-2 text-sm text-slate-500">
    Método de pago: <span className="font-medium text-ink-900">{ETIQUETAS[metodoPago]}</span>
  </p>
)}
```

`page.tsx` le pasa el `metodoPago` del estado local (antes de confirmar, para que se vea en el preview en tiempo real igual que el resto del recibo).

**`VentaDetailClient`** (`src/components/ventas/venta-detail-client.tsx`) — el método de pago de la venta ya confirmada se muestra dentro del `<dl>` existente de datos de factura (mismo bloque que código de generación/número de control/sello), como un quinto par `dt`/`dd`, o si `factura` aún no existe (estado `confirmada`/`procesando_dte`), en un `<dl>` mínimo separado solo con método de pago. Se usa el mismo diccionario de etiquetas que en el recibo.

## Etiquetas compartidas

```ts
export const METODO_PAGO_LABELS: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};
```

Vive en `metodo-pago-selector.tsx` y se importa desde `recibo-preview.tsx`/`venta-detail-client.tsx` (evita repetir el mapeo 3 veces).

## Fuera de scope (v1)

Monto recibido y cálculo de cambio para efectivo, validación real de cobro (autorización de tarjeta, verificación de transferencia), split payment (múltiples métodos en una venta), reportes desglosados por método de pago en `/reportes` (queda como posible ampliación futura de ese sub-proyecto, no de este).

## Manejo de errores

No aplica — es selección de una lista fija de 3 valores, sin inputs libres. El único estado a manejar es "sin seleccionar todavía", que bloquea el botón de confirmar (igual patrón que cliente/carrito vacíos).

## Verificación (sin tests automatizados)

Manual con Playwright: iniciar una venta nueva, confirmar que el stepper muestra 4 pasos y que "Confirmar venta" permanece deshabilitado hasta elegir método de pago. Elegir cada uno de los 3 métodos y confirmar que el recibo preview refleja el cambio en tiempo real. Confirmar la venta, y en la página de detalle verificar que el método de pago elegido se muestra correctamente. Repetir para los 3 métodos. `npm run build` sin errores. `npm test` sigue en 8 archivos/31 tests (este cambio toca `crearVenta`, que sí tiene cobertura en `ventas-context.test.tsx` y `pos-flow.test.tsx` — ver nota abajo).

**Nota sobre tests existentes:** a diferencia de sub-proyectos previos, este cambia la firma de una función (`crearVenta`) que SÍ tiene llamadas directas en tests existentes:

- `ventas-context.test.tsx` (6 llamadas) y `venta-detail-client.test.tsx` (1 llamada) — llaman `crearVenta("cli-1", [lineaEjemplo])` directo, sin pasar por la UI. Necesitan un tercer argumento `metodoPago` (ej. `"efectivo"`) agregado a cada llamada.
- `pos-flow.test.tsx` — no llama `crearVenta` directo, simula clicks en la UI. Su test "permite buscar cliente, agregar producto y confirmar la venta" asume que el botón "Confirmar venta" queda habilitado tras elegir cliente + producto; con el nuevo paso de pago, quedará deshabilitado hasta elegir método. Necesita un `user.click` adicional sobre uno de los 3 botones de método de pago antes de confirmar.

Esto se resuelve en el plan de implementación, no es responsabilidad de "sin tests nuevos" — es mantener verdes los tests que ya existen (8 archivos, 31 tests).
