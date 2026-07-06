# Catálogo Fiscal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an administrable Tipo de Impuesto catalog (CRUD) and switch tax calculation from one global 13% rate to a per-line rate, so a venta can mix gravado/exento/no-sujeto products correctly.

**Architecture:** `TipoImpuesto` is a new entity following the exact CRUD pattern already used for `Producto`/`Usuario` (create/update/toggle-active, no real delete), living in `VentasProvider` alongside `productos`. Each `Producto` gets a required `tipoImpuestoId`; each `LineaVenta` snapshots the resolved `impuestoPct` at add-to-cart time (same rationale as the existing `precioUnitario` snapshot: editing a tipo de impuesto later must not retroactively change historical ventas). `calcularTotalesVenta` sums each line's own tax instead of applying one rate to the whole subtotal.

**Tech Stack:** Next.js 16 App Router, React 19, existing `VentasProvider` context pattern, existing shadcn `Popover`/`Command` combobox pattern (`ClienteCombobox`), existing `AuditoriaProvider` instrumentation pattern.

## Global Constraints

- **No automated tests for new behavior** — explicit user request, same as prior sub-projects. Exception: `src/lib/calculos.test.ts`, `src/lib/ventas-context.test.tsx`, and `src/components/ventas/venta-detail-client.test.tsx` have existing tests/fixtures that break from the type changes in this plan and MUST be fixed (not new tests — existing ones kept green).
- Tipo de Impuesto CRUD is a combobox with search (`Popover`+`Command`, matching `ClienteCombobox`'s pattern), NOT a toggle-button group — unlike `MetodoPago`/`Rol` (fixed 3-value unions), `TipoImpuesto` is an admin-creatable, open-ended list, which is exactly the case this project's combobox convention targets.
- No real delete anywhere — only create/edit/activate-deactivate, same as `Producto`/`Usuario`.
- `LineaVenta.impuestoPct` is a snapshot taken when a product is added to the cart — never re-derived from the live `TipoImpuesto` list afterward.
- Tipo de Impuesto CRUD is audited via the existing `AuditoriaProvider`, exactly like `Producto`/`Usuario` CRUD (4 new `AccionAuditoria` values: `tipo_impuesto_creado`, `tipo_impuesto_actualizado`, `tipo_impuesto_activado`, `tipo_impuesto_desactivado`).
- `h-10` on all buttons/inputs (house rule, no exception).
- No email/name-duplicate validation on tipos de impuesto, no reports broken down by tax type, no more than one tax type per line — all explicitly out of scope per spec.

---

### Task 1: Data model, tax calculation, seed data, audit actions

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/calculos.ts`
- Modify: `src/lib/calculos.test.ts`
- Modify: `src/lib/mock-data/seed.ts`
- Modify: `src/lib/auditoria-context.tsx`
- Modify: `src/lib/ventas-context.test.tsx` (fix 1 broken fixture)
- Modify: `src/components/ventas/venta-detail-client.test.tsx` (fix 1 broken fixture)

**Interfaces:**
- Produces: `TipoImpuesto` interface (`{ id: string; nombre: string; porcentaje: number; activo: boolean }`), exported from `src/lib/types.ts`. Task 2 and Task 3 use this.
- Produces: `Producto.tipoImpuestoId: string` (new required field). Task 2's `crearProducto`/`actualizarProducto` (already generic over `Producto`) need no signature change; Task 3's `ProductoDialog` sets this field.
- Produces: `LineaVenta.impuestoPct: number` (new required field). Task 2's `crearVenta` and Task 3's `carrito-builder.tsx`/`recibo-preview.tsx` consume this.
- Produces: `calcularTotalesVenta(lineas: LineaCalculada[]): TotalesVenta` where `LineaCalculada` now extends the existing subtotal shape with `impuestoPct: number`. `calcularSubtotalLinea` keeps its narrower `LineaSubtotal` parameter type (unchanged behavior, unchanged call sites).
- Produces: `tiposImpuestoSeed: TipoImpuesto[]` (3 entries: `ti-1` Gravado 13%, `ti-2` Exento 0%, `ti-3` No sujeto 0%), exported from `src/lib/mock-data/seed.ts`. Task 2 uses this as `VentasProvider`'s initial state.
- Produces: 4 new `AccionAuditoria` values (`tipo_impuesto_creado`, `tipo_impuesto_actualizado`, `tipo_impuesto_activado`, `tipo_impuesto_desactivado`) with matching `ACCION_LABELS` entries. Task 2 fires these.

- [ ] **Step 1: Add `TipoImpuesto` and update `Producto`/`LineaVenta` in `types.ts`**

Replace the full contents of `src/lib/types.ts`:

```ts
export type EstadoVenta =
  | "borrador"
  | "confirmada"
  | "procesando_dte"
  | "autorizada"
  | "error_dte"
  | "anulacion_solicitada"
  | "anulada";

export type MetodoPago = "efectivo" | "tarjeta" | "transferencia";

export interface Cliente {
  id: string;
  nombre: string;
  tipoDocumento: "DUI" | "NIT" | "Pasaporte";
  nit: string;
  correo?: string;
  telefono?: string;
}

export interface TipoImpuesto {
  id: string;
  nombre: string;
  porcentaje: number;
  activo: boolean;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  precio: number;
  tipo: string;
  tipoImpuestoId: string;
  activo: boolean;
}

export interface LineaVenta {
  id: string;
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  descuentoPct: number;
  impuestoPct: number;
  subtotal: number;
}

export interface Venta {
  id: string;
  clienteId: string;
  lineas: LineaVenta[];
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  estado: EstadoVenta;
  metodoPago: MetodoPago;
  fecha: string;
  motivoAnulacion?: string;
}

export interface Factura {
  id: string;
  ventaId: string;
  correlativo: string;
  codigoGeneracion: string;
  numeroControl: string;
  selloRecepcion?: string;
  fechaEmision: string;
}
```

- [ ] **Step 2: Switch tax calculation to per-line in `calculos.ts`**

Replace the full contents of `src/lib/calculos.ts`:

```ts
export const IVA_PCT = 13;

export interface LineaSubtotal {
  cantidad: number;
  precioUnitario: number;
  descuentoPct: number;
}

export interface LineaCalculada extends LineaSubtotal {
  impuestoPct: number;
}

export interface TotalesVenta {
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcularSubtotalLinea(linea: LineaSubtotal): number {
  const bruto = linea.cantidad * linea.precioUnitario;
  const descuento = bruto * (linea.descuentoPct / 100);
  return round2(bruto - descuento);
}

export function calcularTotalesVenta(lineas: LineaCalculada[]): TotalesVenta {
  const bruto = lineas.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0);
  const descuento = lineas.reduce(
    (acc, l) => acc + l.cantidad * l.precioUnitario * (l.descuentoPct / 100),
    0
  );
  const subtotal = round2(bruto - descuento);
  const impuesto = round2(
    lineas.reduce((acc, l) => acc + calcularSubtotalLinea(l) * (l.impuestoPct / 100), 0)
  );
  const total = round2(subtotal + impuesto);
  return { subtotal, descuento: round2(descuento), impuesto, total };
}
```

- [ ] **Step 3: Fix the 2 existing `calculos.test.ts` cases broken by `impuestoPct` becoming required**

Replace the full contents of `src/lib/calculos.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calcularSubtotalLinea, calcularTotalesVenta, IVA_PCT } from "./calculos";

describe("calcularSubtotalLinea", () => {
  it("aplica cantidad y descuento porcentual", () => {
    const subtotal = calcularSubtotalLinea({ cantidad: 2, precioUnitario: 10, descuentoPct: 10 });
    expect(subtotal).toBe(18);
  });

  it("sin descuento devuelve cantidad * precio", () => {
    const subtotal = calcularSubtotalLinea({ cantidad: 3, precioUnitario: 8.5, descuentoPct: 0 });
    expect(subtotal).toBe(25.5);
  });
});

describe("calcularTotalesVenta", () => {
  it("calcula subtotal, descuento, impuesto (13%) y total sobre varias líneas", () => {
    const totales = calcularTotalesVenta([
      { cantidad: 2, precioUnitario: 10, descuentoPct: 10, impuestoPct: 13 }, // subtotal 18
      { cantidad: 1, precioUnitario: 20, descuentoPct: 0, impuestoPct: 13 }, // subtotal 20
    ]);
    expect(totales.subtotal).toBe(38);
    expect(totales.descuento).toBe(2);
    expect(totales.impuesto).toBe(4.94);
    expect(totales.total).toBe(42.94);
  });

  it("con lista vacía devuelve todo en cero", () => {
    const totales = calcularTotalesVenta([]);
    expect(totales).toEqual({ subtotal: 0, descuento: 0, impuesto: 0, total: 0 });
  });

  it("IVA_PCT es 13", () => {
    expect(IVA_PCT).toBe(13);
  });
});
```

- [ ] **Step 4: Run `calculos.test.ts` to verify it passes**

Run: `npx vitest run src/lib/calculos.test.ts`
Expected: 5 tests pass (2 in `calcularSubtotalLinea`, 3 in `calcularTotalesVenta`).

- [ ] **Step 5: Add `tiposImpuestoSeed` and assign it to all seed productos in `seed.ts`**

Replace the full contents of `src/lib/mock-data/seed.ts`:

```ts
import type { Cliente, Factura, Producto, TipoImpuesto, Venta } from "@/lib/types";

export const clientesSeed: Cliente[] = [
  {
    id: "cli-1",
    nombre: "Distribuidora San Miguel S.A. de C.V.",
    tipoDocumento: "NIT",
    nit: "0614-010190-101-2",
    correo: "contacto@distsm.com",
    telefono: "2222-3344",
  },
  {
    id: "cli-2",
    nombre: "Karla Beatriz Hernández",
    tipoDocumento: "DUI",
    nit: "04521789-3",
    correo: "karla.hdz@gmail.com",
  },
  {
    id: "cli-3",
    nombre: "Ferretería El Martillo",
    tipoDocumento: "NIT",
    nit: "0614-250887-102-5",
    telefono: "2245-9090",
  },
];

export const tiposImpuestoSeed: TipoImpuesto[] = [
  { id: "ti-1", nombre: "Gravado", porcentaje: 13, activo: true },
  { id: "ti-2", nombre: "Exento", porcentaje: 0, activo: true },
  { id: "ti-3", nombre: "No sujeto", porcentaje: 0, activo: true },
];

export const productosSeed: Producto[] = [
  { id: "prod-1", codigo: "P-001", nombre: "Cemento Fortaleza 42.5kg", precio: 8.5, tipo: "Material construcción", tipoImpuestoId: "ti-1", activo: true },
  { id: "prod-2", codigo: "P-002", nombre: 'Varilla de hierro 3/8" x 6m', precio: 6.75, tipo: "Material construcción", tipoImpuestoId: "ti-1", activo: true },
  { id: "prod-3", codigo: "P-003", nombre: "Pintura látex blanco 1gal", precio: 14.9, tipo: "Pintura", tipoImpuestoId: "ti-1", activo: true },
  { id: "prod-4", codigo: "P-004", nombre: "Taladro inalámbrico 20V", precio: 45.0, tipo: "Herramienta", tipoImpuestoId: "ti-1", activo: true },
  { id: "prod-5", codigo: "P-005", nombre: "Servicio de instalación", precio: 25.0, tipo: "Servicio", tipoImpuestoId: "ti-1", activo: true },
  { id: "prod-6", codigo: "P-006", nombre: "Cinta métrica 5m (descontinuada)", precio: 3.25, tipo: "Herramienta", tipoImpuestoId: "ti-1", activo: false },
];

export const ventasSeed: Venta[] = [];
export const facturasSeed: Factura[] = [];
```

- [ ] **Step 6: Add the 4 new audit actions in `auditoria-context.tsx`**

In `src/lib/auditoria-context.tsx`, change the `AccionAuditoria` union (add 4 members before the closing semicolon):

```ts
export type AccionAuditoria =
  | "login"
  | "logout"
  | "cliente_registrado"
  | "producto_creado"
  | "producto_actualizado"
  | "producto_activado"
  | "producto_desactivado"
  | "venta_creada"
  | "anulacion_solicitada"
  | "anulacion_aprobada"
  | "anulacion_rechazada"
  | "emision_reintentada"
  | "usuario_creado"
  | "usuario_actualizado"
  | "usuario_activado"
  | "usuario_desactivado"
  | "tipo_impuesto_creado"
  | "tipo_impuesto_actualizado"
  | "tipo_impuesto_activado"
  | "tipo_impuesto_desactivado";
```

Change `ACCION_LABELS` (add 4 entries before the closing brace):

```ts
export const ACCION_LABELS: Record<AccionAuditoria, string> = {
  login: "Inicio de sesión",
  logout: "Cierre de sesión",
  cliente_registrado: "Cliente registrado",
  producto_creado: "Producto creado",
  producto_actualizado: "Producto actualizado",
  producto_activado: "Producto activado",
  producto_desactivado: "Producto desactivado",
  venta_creada: "Venta creada",
  anulacion_solicitada: "Anulación solicitada",
  anulacion_aprobada: "Anulación aprobada",
  anulacion_rechazada: "Anulación rechazada",
  emision_reintentada: "Reintento de emisión",
  usuario_creado: "Usuario creado",
  usuario_actualizado: "Usuario actualizado",
  usuario_activado: "Usuario activado",
  usuario_desactivado: "Usuario desactivado",
  tipo_impuesto_creado: "Tipo de impuesto creado",
  tipo_impuesto_actualizado: "Tipo de impuesto actualizado",
  tipo_impuesto_activado: "Tipo de impuesto activado",
  tipo_impuesto_desactivado: "Tipo de impuesto desactivado",
};
```

Nothing else in this file changes.

- [ ] **Step 7: Fix the broken `LineaVenta` fixture in `ventas-context.test.tsx`**

In `src/lib/ventas-context.test.tsx`, find:

```ts
const lineaEjemplo: LineaVenta = {
  id: "linea-1",
  productoId: "prod-1",
  nombreProducto: "Cemento Fortaleza 42.5kg",
  cantidad: 2,
  precioUnitario: 8.5,
  descuentoPct: 0,
  subtotal: 17,
};
```

Add `impuestoPct: 13,` after `descuentoPct: 0,`:

```ts
const lineaEjemplo: LineaVenta = {
  id: "linea-1",
  productoId: "prod-1",
  nombreProducto: "Cemento Fortaleza 42.5kg",
  cantidad: 2,
  precioUnitario: 8.5,
  descuentoPct: 0,
  impuestoPct: 13,
  subtotal: 17,
};
```

- [ ] **Step 8: Fix the broken `LineaVenta` fixture in `venta-detail-client.test.tsx`**

In `src/components/ventas/venta-detail-client.test.tsx`, find:

```ts
const lineaEjemplo: LineaVenta = {
  id: "linea-1",
  productoId: "prod-1",
  nombreProducto: "Cemento Fortaleza 42.5kg",
  cantidad: 1,
  precioUnitario: 8.5,
  descuentoPct: 0,
  subtotal: 8.5,
};
```

Add `impuestoPct: 13,` after `descuentoPct: 0,`:

```ts
const lineaEjemplo: LineaVenta = {
  id: "linea-1",
  productoId: "prod-1",
  nombreProducto: "Cemento Fortaleza 42.5kg",
  cantidad: 1,
  precioUnitario: 8.5,
  descuentoPct: 0,
  impuestoPct: 13,
  subtotal: 8.5,
};
```

- [ ] **Step 9: Run the full test suite**

Run: `npm test`
Expected: all 8 files, 31 tests pass.

- [ ] **Step 10: Verify the build**

Run: `npm run build`
Expected: succeeds, no type errors. (The app won't fully build yet if any other file still references the old `Producto`/`LineaVenta` shape without the new required fields — if so, that's expected here since Tasks 2/3 haven't run; but this codebase's only other `Producto`/`LineaVenta` construction sites are `ventas-context.tsx`'s `crearProducto`/`crearVenta`, which are purely generic over the type and need no changes themselves. Confirm the build actually succeeds — if it doesn't, something in this step's file list is incomplete.)

- [ ] **Step 11: Commit**

```bash
git add src/lib/types.ts src/lib/calculos.ts src/lib/calculos.test.ts src/lib/mock-data/seed.ts src/lib/auditoria-context.tsx src/lib/ventas-context.test.tsx src/components/ventas/venta-detail-client.test.tsx
git commit -m "feat: add TipoImpuesto model, per-line tax calculation, and audit actions"
```

---

### Task 2: `TipoImpuesto` CRUD + `crearVenta` per-line tax wiring in `VentasProvider`

**Files:**
- Modify: `src/lib/ventas-context.tsx`

**Interfaces:**
- Consumes: `TipoImpuesto` type, `Producto.tipoImpuestoId`, `LineaVenta.impuestoPct` (Task 1); `tiposImpuestoSeed` (Task 1); `AccionAuditoria` values `tipo_impuesto_creado`/`tipo_impuesto_actualizado`/`tipo_impuesto_activado`/`tipo_impuesto_desactivado` (Task 1).
- Produces: `tiposImpuesto: TipoImpuesto[]`, `crearTipoImpuesto(data: Omit<TipoImpuesto, "id" | "activo">): TipoImpuesto`, `actualizarTipoImpuesto(id: string, data: Partial<Omit<TipoImpuesto, "id">>): void`, `toggleActivoTipoImpuesto(id: string): void`, `getTipoImpuestoPorId(id: string): TipoImpuesto | undefined` — all on `useVentas()`. Task 3 consumes all of these.

- [ ] **Step 1: Add `TipoImpuesto` state, CRUD, and per-line tax wiring**

Replace the full contents of `src/lib/ventas-context.tsx`:

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Cliente,
  Factura,
  LineaVenta,
  MetodoPago,
  Producto,
  TipoImpuesto,
  Venta,
} from "@/lib/types";
import {
  clientesSeed,
  facturasSeed,
  productosSeed,
  tiposImpuestoSeed,
  ventasSeed,
} from "@/lib/mock-data/seed";
import { generarFactura } from "@/lib/mock-data/factura-generator";
import { calcularTotalesVenta } from "@/lib/calculos";
import { useAuthOpcional } from "@/lib/auth-context";
import { useAuditoriaOpcional } from "@/lib/auditoria-context";

export let randomFn: () => number = Math.random;
export function __setRandomForTesting(fn: () => number) {
  randomFn = fn;
}

interface VentasContextValue {
  clientes: Cliente[];
  productos: Producto[];
  tiposImpuesto: TipoImpuesto[];
  ventas: Venta[];
  facturas: Factura[];
  buscarClientes: (query: string) => Cliente[];
  buscarClientePorNit: (nit: string) => Cliente | undefined;
  registrarCliente: (data: Omit<Cliente, "id">) => Cliente;
  buscarProductos: (query: string) => Producto[];
  crearProducto: (data: Omit<Producto, "id">) => Producto;
  actualizarProducto: (id: string, data: Partial<Omit<Producto, "id">>) => void;
  toggleActivoProducto: (id: string) => void;
  crearTipoImpuesto: (data: Omit<TipoImpuesto, "id" | "activo">) => TipoImpuesto;
  actualizarTipoImpuesto: (id: string, data: Partial<Omit<TipoImpuesto, "id">>) => void;
  toggleActivoTipoImpuesto: (id: string) => void;
  getTipoImpuestoPorId: (id: string) => TipoImpuesto | undefined;
  crearVenta: (clienteId: string, lineas: LineaVenta[], metodoPago: MetodoPago) => string;
  solicitarAnulacion: (ventaId: string, motivo: string) => void;
  aprobarAnulacion: (ventaId: string) => void;
  rechazarAnulacion: (ventaId: string) => void;
  reintentarEmision: (ventaId: string) => void;
  getVenta: (ventaId: string) => Venta | undefined;
  getClientePorId: (clienteId: string) => Cliente | undefined;
  getFacturaByVentaId: (ventaId: string) => Factura | undefined;
}

const VentasContext = createContext<VentasContextValue | null>(null);

export function VentasProvider({ children }: { children: ReactNode }) {
  const authCtx = useAuthOpcional();
  const auditoriaCtx = useAuditoriaOpcional();
  const usuarioActual = authCtx?.usuarioActual ?? null;
  const registrarEvento = auditoriaCtx?.registrarEvento;

  const [clientes, setClientes] = useState<Cliente[]>(clientesSeed);
  const [productos, setProductos] = useState<Producto[]>(productosSeed);
  const [tiposImpuesto, setTiposImpuesto] = useState<TipoImpuesto[]>(tiposImpuestoSeed);
  const [ventas, setVentas] = useState<Venta[]>(ventasSeed);
  const [facturas, setFacturas] = useState<Factura[]>(facturasSeed);
  const secuenciaRef = useRef(facturasSeed.length + 1);

  const buscarClientes = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return clientes;
      return clientes.filter(
        (c) => c.nombre.toLowerCase().includes(q) || c.nit.toLowerCase().includes(q)
      );
    },
    [clientes]
  );

  const buscarClientePorNit = useCallback(
    (nit: string) => clientes.find((c) => c.nit === nit),
    [clientes]
  );

  const registrarCliente = useCallback(
    (data: Omit<Cliente, "id">) => {
      const nuevo: Cliente = { ...data, id: crypto.randomUUID() };
      setClientes((prev) => [...prev, nuevo]);
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: "cliente_registrado",
        detalle: `Cliente "${nuevo.nombre}" registrado`,
      });
      return nuevo;
    },
    [usuarioActual, registrarEvento]
  );

  const buscarProductos = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return productos.filter(
        (p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
      );
    },
    [productos]
  );

  const crearProducto = useCallback(
    (data: Omit<Producto, "id">) => {
      const nuevo: Producto = { ...data, id: crypto.randomUUID() };
      setProductos((prev) => [...prev, nuevo]);
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: "producto_creado",
        detalle: `Producto "${nuevo.nombre}" creado`,
      });
      return nuevo;
    },
    [usuarioActual, registrarEvento]
  );

  const actualizarProducto = useCallback(
    (id: string, data: Partial<Omit<Producto, "id">>) => {
      const producto = productos.find((p) => p.id === id);
      setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
      if (producto) {
        registrarEvento?.({
          usuarioId: usuarioActual?.id ?? null,
          usuarioNombre: usuarioActual?.nombre ?? "Sistema",
          accion: "producto_actualizado",
          detalle: `Producto "${producto.nombre}" actualizado`,
        });
      }
    },
    [productos, usuarioActual, registrarEvento]
  );

  const toggleActivoProducto = useCallback(
    (id: string) => {
      const producto = productos.find((p) => p.id === id);
      if (!producto) return;
      const nuevoActivo = !producto.activo;
      setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, activo: nuevoActivo } : p)));
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: nuevoActivo ? "producto_activado" : "producto_desactivado",
        detalle: `Producto "${producto.nombre}" ${nuevoActivo ? "activado" : "desactivado"}`,
      });
    },
    [productos, usuarioActual, registrarEvento]
  );

  const crearTipoImpuesto = useCallback(
    (data: Omit<TipoImpuesto, "id" | "activo">) => {
      const nuevo: TipoImpuesto = { ...data, id: crypto.randomUUID(), activo: true };
      setTiposImpuesto((prev) => [...prev, nuevo]);
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: "tipo_impuesto_creado",
        detalle: `Tipo de impuesto "${nuevo.nombre}" (${nuevo.porcentaje}%) creado`,
      });
      return nuevo;
    },
    [usuarioActual, registrarEvento]
  );

  const actualizarTipoImpuesto = useCallback(
    (id: string, data: Partial<Omit<TipoImpuesto, "id">>) => {
      const tipo = tiposImpuesto.find((t) => t.id === id);
      setTiposImpuesto((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
      if (tipo) {
        registrarEvento?.({
          usuarioId: usuarioActual?.id ?? null,
          usuarioNombre: usuarioActual?.nombre ?? "Sistema",
          accion: "tipo_impuesto_actualizado",
          detalle: `Tipo de impuesto "${tipo.nombre}" actualizado`,
        });
      }
    },
    [tiposImpuesto, usuarioActual, registrarEvento]
  );

  const toggleActivoTipoImpuesto = useCallback(
    (id: string) => {
      const tipo = tiposImpuesto.find((t) => t.id === id);
      if (!tipo) return;
      const nuevoActivo = !tipo.activo;
      setTiposImpuesto((prev) => prev.map((t) => (t.id === id ? { ...t, activo: nuevoActivo } : t)));
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: nuevoActivo ? "tipo_impuesto_activado" : "tipo_impuesto_desactivado",
        detalle: `Tipo de impuesto "${tipo.nombre}" ${nuevoActivo ? "activado" : "desactivado"}`,
      });
    },
    [tiposImpuesto, usuarioActual, registrarEvento]
  );

  const getTipoImpuestoPorId = useCallback(
    (id: string) => tiposImpuesto.find((t) => t.id === id),
    [tiposImpuesto]
  );

  const resolverEmision = useCallback((ventaId: string) => {
    setVentas((prev) =>
      prev.map((v) => (v.id === ventaId ? { ...v, estado: "procesando_dte" } : v))
    );
    setTimeout(() => {
      const exito = randomFn() > 0.05;
      if (exito) {
        const secuencia = secuenciaRef.current++;
        const factura = generarFactura(ventaId, secuencia);
        setFacturas((prev) => [...prev, factura]);
        setVentas((prev) =>
          prev.map((v) => (v.id === ventaId ? { ...v, estado: "autorizada" } : v))
        );
      } else {
        setVentas((prev) =>
          prev.map((v) => (v.id === ventaId ? { ...v, estado: "error_dte" } : v))
        );
      }
    }, 1200);
  }, []);

  const crearVenta = useCallback(
    (clienteId: string, lineas: LineaVenta[], metodoPago: MetodoPago) => {
      const totales = calcularTotalesVenta(
        lineas.map((l) => ({
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
          descuentoPct: l.descuentoPct,
          impuestoPct: l.impuestoPct,
        }))
      );
      const id = crypto.randomUUID();
      const nuevaVenta: Venta = {
        id,
        clienteId,
        lineas,
        ...totales,
        estado: "confirmada",
        metodoPago,
        fecha: new Date().toISOString(),
      };
      setVentas((prev) => [nuevaVenta, ...prev]);
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: "venta_creada",
        detalle: `Venta ${id.slice(0, 8)} creada`,
      });
      setTimeout(() => resolverEmision(id), 400);
      return id;
    },
    [resolverEmision, usuarioActual, registrarEvento]
  );

  const solicitarAnulacion = useCallback(
    (ventaId: string, motivo: string) => {
      setVentas((prev) =>
        prev.map((v) =>
          v.id === ventaId ? { ...v, estado: "anulacion_solicitada", motivoAnulacion: motivo } : v
        )
      );
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: "anulacion_solicitada",
        detalle: `Anulación solicitada para venta ${ventaId.slice(0, 8)}: ${motivo}`,
      });
    },
    [usuarioActual, registrarEvento]
  );

  const aprobarAnulacion = useCallback(
    (ventaId: string) => {
      setVentas((prev) =>
        prev.map((v) => (v.id === ventaId ? { ...v, estado: "anulada" } : v))
      );
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: "anulacion_aprobada",
        detalle: `Anulación aprobada para venta ${ventaId.slice(0, 8)}`,
      });
    },
    [usuarioActual, registrarEvento]
  );

  const rechazarAnulacion = useCallback(
    (ventaId: string) => {
      setVentas((prev) =>
        prev.map((v) =>
          v.id === ventaId ? { ...v, estado: "autorizada", motivoAnulacion: undefined } : v
        )
      );
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: "anulacion_rechazada",
        detalle: `Anulación rechazada para venta ${ventaId.slice(0, 8)}`,
      });
    },
    [usuarioActual, registrarEvento]
  );

  const reintentarEmision = useCallback(
    (ventaId: string) => {
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: "emision_reintentada",
        detalle: `Reintento de emisión para venta ${ventaId.slice(0, 8)}`,
      });
      resolverEmision(ventaId);
    },
    [resolverEmision, usuarioActual, registrarEvento]
  );

  const getVenta = useCallback(
    (ventaId: string) => ventas.find((v) => v.id === ventaId),
    [ventas]
  );
  const getClientePorId = useCallback(
    (clienteId: string) => clientes.find((c) => c.id === clienteId),
    [clientes]
  );
  const getFacturaByVentaId = useCallback(
    (ventaId: string) => facturas.find((f) => f.ventaId === ventaId),
    [facturas]
  );

  return (
    <VentasContext.Provider
      value={{
        clientes,
        productos,
        tiposImpuesto,
        ventas,
        facturas,
        buscarClientes,
        buscarClientePorNit,
        registrarCliente,
        buscarProductos,
        crearProducto,
        actualizarProducto,
        toggleActivoProducto,
        crearTipoImpuesto,
        actualizarTipoImpuesto,
        toggleActivoTipoImpuesto,
        getTipoImpuestoPorId,
        crearVenta,
        solicitarAnulacion,
        aprobarAnulacion,
        rechazarAnulacion,
        reintentarEmision,
        getVenta,
        getClientePorId,
        getFacturaByVentaId,
      }}
    >
      {children}
    </VentasContext.Provider>
  );
}

export function useVentas() {
  const ctx = useContext(VentasContext);
  if (!ctx) throw new Error("useVentas debe usarse dentro de VentasProvider");
  return ctx;
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all 8 files, 31 tests pass — no UI reads `tiposImpuesto`/`crearTipoImpuesto`/etc. yet, but nothing else in this file's public shape changed in a way any test relies on.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: succeeds, no type errors. No visible UI change yet (Task 3 wires the screens) — this task's deliverable is a compiling, working data layer.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ventas-context.tsx
git commit -m "feat: add TipoImpuesto CRUD and per-line tax wiring to VentasProvider"
```

---

### Task 3: UI — combobox, dialog, catálogos tabs, carrito/recibo wiring

**Files:**
- Create: `src/components/catalogos/tipo-impuesto-combobox.tsx`
- Create: `src/components/catalogos/tipo-impuesto-dialog.tsx`
- Modify: `src/components/catalogos/producto-dialog.tsx`
- Modify: `src/app/(app)/catalogos/page.tsx`
- Modify: `src/components/ventas/carrito-builder.tsx`
- Modify: `src/components/ventas/recibo-preview.tsx`

**Interfaces:**
- Consumes: `tiposImpuesto`, `crearTipoImpuesto`, `actualizarTipoImpuesto`, `toggleActivoTipoImpuesto`, `getTipoImpuestoPorId` (Task 2, all on `useVentas()`); `TipoImpuesto` type (Task 1).

- [ ] **Step 1: Create `TipoImpuestoCombobox`**

Create `src/components/catalogos/tipo-impuesto-combobox.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useVentas } from "@/lib/ventas-context";

interface TipoImpuestoComboboxProps {
  value: string;
  onChange: (tipoImpuestoId: string) => void;
}

export function TipoImpuestoCombobox({ value, onChange }: TipoImpuestoComboboxProps) {
  const { tiposImpuesto } = useVentas();
  const [open, setOpen] = useState(false);
  const seleccionado = tiposImpuesto.find((t) => t.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            className="h-10 w-full justify-between bg-popover font-normal text-foreground"
          />
        }
      >
        <span className={cn(!value && "text-muted-foreground")}>
          {seleccionado ? `${seleccionado.nombre} (${seleccionado.porcentaje}%)` : "Seleccionar tipo de impuesto..."}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) p-0">
        <Command>
          <CommandInput placeholder="Buscar tipo de impuesto..." className="h-9" />
          <CommandList>
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            <CommandGroup>
              {tiposImpuesto.map((tipo) => (
                <CommandItem
                  key={tipo.id}
                  value={tipo.nombre}
                  onSelect={() => {
                    onChange(tipo.id === value ? "" : tipo.id);
                    setOpen(false);
                  }}
                >
                  {tipo.nombre} ({tipo.porcentaje}%)
                  <Check
                    className={cn("ml-auto h-4 w-4", value === tipo.id ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Create `TipoImpuestoDialog`**

Create `src/components/catalogos/tipo-impuesto-dialog.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVentas } from "@/lib/ventas-context";
import type { TipoImpuesto } from "@/lib/types";

interface TipoImpuestoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipoImpuesto?: TipoImpuesto;
}

export function TipoImpuestoDialog({ open, onOpenChange, tipoImpuesto }: TipoImpuestoDialogProps) {
  const { crearTipoImpuesto, actualizarTipoImpuesto } = useVentas();
  const [nombre, setNombre] = useState("");
  const [porcentaje, setPorcentaje] = useState("");

  useEffect(() => {
    if (open) {
      setNombre(tipoImpuesto?.nombre ?? "");
      setPorcentaje(tipoImpuesto ? String(tipoImpuesto.porcentaje) : "");
    }
  }, [open, tipoImpuesto]);

  const porcentajeNumero = Number(porcentaje);
  const porcentajeValido =
    porcentaje.trim() !== "" &&
    !Number.isNaN(porcentajeNumero) &&
    porcentajeNumero >= 0 &&
    porcentajeNumero <= 100;
  const puedeGuardar = nombre.trim() !== "" && porcentajeValido;

  const handleSubmit = () => {
    if (!puedeGuardar) return;
    if (tipoImpuesto) {
      actualizarTipoImpuesto(tipoImpuesto.id, {
        nombre: nombre.trim(),
        porcentaje: porcentajeNumero,
      });
      toast.success("Tipo de impuesto actualizado");
    } else {
      crearTipoImpuesto({
        nombre: nombre.trim(),
        porcentaje: porcentajeNumero,
      });
      toast.success("Tipo de impuesto creado");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tipoImpuesto ? "Editar tipo de impuesto" : "Nuevo tipo de impuesto"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" className="h-10" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="porcentaje">Porcentaje</Label>
            <Input
              id="porcentaje"
              type="number"
              step="0.01"
              min={0}
              max={100}
              className="h-10"
              value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)}
            />
            {porcentaje.trim() !== "" && !porcentajeValido && (
              <p className="text-sm text-error-700">El porcentaje debe estar entre 0 y 100.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button className="h-10" onClick={handleSubmit} disabled={!puedeGuardar}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Add the tipo-de-impuesto field to `ProductoDialog`**

Replace the full contents of `src/components/catalogos/producto-dialog.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TipoImpuestoCombobox } from "@/components/catalogos/tipo-impuesto-combobox";
import { useVentas } from "@/lib/ventas-context";
import type { Producto } from "@/lib/types";

interface ProductoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto?: Producto;
}

export function ProductoDialog({ open, onOpenChange, producto }: ProductoDialogProps) {
  const { crearProducto, actualizarProducto } = useVentas();
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [precio, setPrecio] = useState("");
  const [tipo, setTipo] = useState("");
  const [tipoImpuestoId, setTipoImpuestoId] = useState("");

  useEffect(() => {
    if (open) {
      setNombre(producto?.nombre ?? "");
      setCodigo(producto?.codigo ?? "");
      setPrecio(producto ? String(producto.precio) : "");
      setTipo(producto?.tipo ?? "");
      setTipoImpuestoId(producto?.tipoImpuestoId ?? "");
    }
  }, [open, producto]);

  const precioNumero = Number(precio);
  const precioValido = precio.trim() !== "" && !Number.isNaN(precioNumero) && precioNumero > 0;
  const puedeGuardar =
    nombre.trim() !== "" &&
    codigo.trim() !== "" &&
    tipo.trim() !== "" &&
    tipoImpuestoId !== "" &&
    precioValido;

  const handleSubmit = () => {
    if (!puedeGuardar) return;
    if (producto) {
      actualizarProducto(producto.id, {
        nombre: nombre.trim(),
        codigo: codigo.trim(),
        precio: precioNumero,
        tipo: tipo.trim(),
        tipoImpuestoId,
      });
      toast.success("Producto actualizado");
    } else {
      crearProducto({
        nombre: nombre.trim(),
        codigo: codigo.trim(),
        precio: precioNumero,
        tipo: tipo.trim(),
        tipoImpuestoId,
        activo: true,
      });
      toast.success("Producto creado");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{producto ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" className="h-10" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="codigo">Código</Label>
            <Input id="codigo" className="h-10" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="precio">Precio</Label>
            <Input
              id="precio"
              type="number"
              step="0.01"
              className="h-10"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
            {precio.trim() !== "" && !precioValido && (
              <p className="text-sm text-error-700">El precio debe ser un número mayor a 0.</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tipo">Tipo</Label>
            <Input id="tipo" className="h-10" value={tipo} onChange={(e) => setTipo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tipo de impuesto</Label>
            <TipoImpuestoCombobox value={tipoImpuestoId} onChange={setTipoImpuestoId} />
          </div>
        </div>
        <DialogFooter>
          <Button className="h-10" onClick={handleSubmit} disabled={!puedeGuardar}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Add tabs and the Tipos de Impuesto table to `/catalogos`**

Replace the full contents of `src/app/(app)/catalogos/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useVentas } from "@/lib/ventas-context";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductoDialog } from "@/components/catalogos/producto-dialog";
import { TipoImpuestoDialog } from "@/components/catalogos/tipo-impuesto-dialog";
import type { Producto, TipoImpuesto } from "@/lib/types";

type Tab = "productos" | "impuestos";

export default function CatalogosPage() {
  const { usuarioActual } = useAuth();
  const router = useRouter();
  const { productos, toggleActivoProducto, tiposImpuesto, toggleActivoTipoImpuesto } = useVentas();
  const [tab, setTab] = useState<Tab>("productos");
  const [dialogProductoAbierto, setDialogProductoAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | undefined>(undefined);
  const [dialogImpuestoAbierto, setDialogImpuestoAbierto] = useState(false);
  const [tipoEditando, setTipoEditando] = useState<TipoImpuesto | undefined>(undefined);

  useEffect(() => {
    if (usuarioActual && usuarioActual.rol !== "administrador") {
      router.replace("/");
    }
  }, [usuarioActual, router]);

  if (!usuarioActual || usuarioActual.rol !== "administrador") {
    return null;
  }

  const abrirNuevoProducto = () => {
    setProductoEditando(undefined);
    setDialogProductoAbierto(true);
  };

  const abrirEditarProducto = (producto: Producto) => {
    setProductoEditando(producto);
    setDialogProductoAbierto(true);
  };

  const abrirNuevoTipo = () => {
    setTipoEditando(undefined);
    setDialogImpuestoAbierto(true);
  };

  const abrirEditarTipo = (tipo: TipoImpuesto) => {
    setTipoEditando(tipo);
    setDialogImpuestoAbierto(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Catálogos</h1>
        {tab === "productos" ? (
          <Button className="h-10" onClick={abrirNuevoProducto}>
            + Nuevo producto
          </Button>
        ) : (
          <Button className="h-10" onClick={abrirNuevoTipo}>
            + Nuevo tipo de impuesto
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          className="h-10"
          variant={tab === "productos" ? "default" : "outline"}
          onClick={() => setTab("productos")}
        >
          Productos
        </Button>
        <Button
          className="h-10"
          variant={tab === "impuestos" ? "default" : "outline"}
          onClick={() => setTab("impuestos")}
        >
          Tipos de impuesto
        </Button>
      </div>

      {tab === "productos" ? (
        <div className="overflow-hidden rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.map((producto) => (
                <TableRow key={producto.id}>
                  <TableCell className="font-mono text-sm">{producto.codigo}</TableCell>
                  <TableCell>{producto.nombre}</TableCell>
                  <TableCell className="font-mono">${producto.precio.toFixed(2)}</TableCell>
                  <TableCell>{producto.tipo}</TableCell>
                  <TableCell>{producto.activo ? "Sí" : "No"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button className="h-10" variant="outline" onClick={() => abrirEditarProducto(producto)}>
                        Editar
                      </Button>
                      <Button
                        className="h-10"
                        variant="outline"
                        onClick={() => toggleActivoProducto(producto.id)}
                      >
                        {producto.activo ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Porcentaje</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiposImpuesto.map((tipo) => (
                <TableRow key={tipo.id}>
                  <TableCell>{tipo.nombre}</TableCell>
                  <TableCell className="font-mono">{tipo.porcentaje}%</TableCell>
                  <TableCell>{tipo.activo ? "Sí" : "No"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button className="h-10" variant="outline" onClick={() => abrirEditarTipo(tipo)}>
                        Editar
                      </Button>
                      <Button
                        className="h-10"
                        variant="outline"
                        onClick={() => toggleActivoTipoImpuesto(tipo.id)}
                      >
                        {tipo.activo ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProductoDialog open={dialogProductoAbierto} onOpenChange={setDialogProductoAbierto} producto={productoEditando} />
      <TipoImpuestoDialog open={dialogImpuestoAbierto} onOpenChange={setDialogImpuestoAbierto} tipoImpuesto={tipoEditando} />
    </div>
  );
}
```

- [ ] **Step 5: Snapshot `impuestoPct` when adding a product to the cart in `carrito-builder.tsx`**

In `src/components/ventas/carrito-builder.tsx`, change the `useVentas()` destructure:

```ts
  const { buscarProductos, getTipoImpuestoPorId } = useVentas();
```

Change the `nueva` object construction inside `agregarProducto` (add `impuestoPct` after `descuentoPct: 0,`):

```ts
    const nueva: LineaVenta = {
      id: crypto.randomUUID(),
      productoId: producto.id,
      nombreProducto: producto.nombre,
      cantidad: 1,
      precioUnitario: producto.precio,
      descuentoPct: 0,
      impuestoPct: getTipoImpuestoPorId(producto.tipoImpuestoId)?.porcentaje ?? 0,
      subtotal: calcularSubtotalLinea({ cantidad: 1, precioUnitario: producto.precio, descuentoPct: 0 }),
    };
```

Nothing else in this file changes — the "existing line" quantity-increment branch and `actualizarLinea` both spread the existing `LineaVenta` object, which already carries `impuestoPct` from when it was first added.

- [ ] **Step 6: Update `ReciboPreview`'s tax label and calculation input**

In `src/components/ventas/recibo-preview.tsx`, change the `calcularTotalesVenta` call:

```ts
  const totales = calcularTotalesVenta(
    lineas.map((l) => ({
      cantidad: l.cantidad,
      precioUnitario: l.precioUnitario,
      descuentoPct: l.descuentoPct,
      impuestoPct: l.impuestoPct,
    }))
  );
```

Change the totals block's tax row label from `IVA (13%)` to `Impuesto`:

```tsx
        <div className="flex justify-between text-slate-500">
          <span>Impuesto</span>
          <span className="font-mono">${totales.impuesto.toFixed(2)}</span>
        </div>
```

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: all 8 files, 31 tests pass.

- [ ] **Step 8: Verify the build**

Run: `npm run build`
Expected: succeeds, no type errors.

- [ ] **Step 9: Manual verification with Playwright**

With the dev server running:

1. Log in as Lucía (administrador), go to `/catalogos`. Confirm two tab buttons: "Productos" (selected by default) and "Tipos de impuesto".
2. Click "Tipos de impuesto". Confirm 3 rows: Gravado 13%, Exento 0%, No sujeto 0%, all "Activo: Sí".
3. Click "+ Nuevo tipo de impuesto", create one named "Percibido" at 5% to prove creation works end-to-end. Confirm it appears in the table.
4. Click "Productos" tab, click "+ Nuevo producto". Confirm the dialog has a "Tipo de impuesto" combobox. Create a product assigned to the seeded "Exento" (0%) type.
5. Go to "Nueva venta" as Lucía or logged in as Ana. Add the new exento product AND one of the original gravado products (e.g. Cemento Fortaleza) to the cart. Confirm the recibo preview's "Impuesto" line reflects only the gravado line's 13% (the exento line contributes $0 tax) — e.g. Cemento Fortaleza $8.50 → $1.11 tax; exento product's price contributes $0 tax; total "Impuesto" should equal exactly the gravado line's own 13%, not 13% of the combined subtotal.
6. Confirm "Método de pago" and complete the venta. On the venta detail page, confirm totals match the recibo preview's math.
7. Log in as Lucía, go to `/auditoria`, confirm a "Tipo de impuesto creado" event appears (from step 3) attributed to Lucía.

- [ ] **Step 10: Commit**

```bash
git add src/components/catalogos/tipo-impuesto-combobox.tsx src/components/catalogos/tipo-impuesto-dialog.tsx src/components/catalogos/producto-dialog.tsx "src/app/(app)/catalogos/page.tsx" src/components/ventas/carrito-builder.tsx src/components/ventas/recibo-preview.tsx
git commit -m "feat: add tipo de impuesto UI and wire per-line tax into POS flow"
```

---

## Manual verification (after Task 3)

Re-run Task 3 Step 9 once more end-to-end as a final sanity pass. Confirm `npm test` (8 files, 31 tests) and `npm run build` both stay green. This is the 9th and last of the sub-projects mapped from the original diagrams (POS, Auth+Roles, Anulación con Supervisor, Catálogos, Reportes, Pagos, Seguridad, Auditoría, Catálogo Fiscal) — after this, all 6 original modules and every RF-V/RF-S/RF-A item are covered. Consider a final whole-branch review across everything built before calling GOTHAM's prototype complete.
