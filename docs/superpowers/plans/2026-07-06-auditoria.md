# Auditoría del Sistema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a system-wide audit log (RF-A03) that records every user-triggered mutation (login/logout, cliente/producto/usuario CRUD, venta lifecycle events) and a read-only `/auditoria` admin page to view it.

**Architecture:** A new `AuditoriaProvider` context sits at the root of the provider tree (`AuditoriaProvider > AuthProvider > VentasProvider`), so both `AuthProvider` and `VentasProvider` can call `registrarEvento` internally without any page or component changing its existing calls. Because 5 existing test files render `VentasProvider` standalone (no `AuthProvider`/`AuditoriaProvider` ancestor), `VentasProvider` consumes two new non-throwing "optional" hook variants instead of the normal throwing ones, so those tests keep passing unmodified.

**Tech Stack:** Next.js 16 App Router, React 19, existing `AuthProvider`/`VentasProvider` context patterns, existing shadcn `Table`.

## Global Constraints

- **No automated tests for new behavior** — explicit user request, same as prior sub-projects. Verify with `npm run build` + manual Playwright pass.
- **The 5 existing tests that render `<VentasProvider>` standalone must keep passing unmodified**: `src/lib/ventas-context.test.tsx`, `src/components/ventas/venta-detail-client.test.tsx`, `src/components/ventas/cliente-nuevo-dialog.test.tsx`, `src/components/ventas/carrito-builder.test.tsx`, `src/app/(app)/ventas/nueva/pos-flow.test.tsx`. None of them wrap `VentasProvider` in `AuthProvider`/`AuditoriaProvider`, so `VentasProvider` must use the optional hook variants (`useAuthOpcional`, `useAuditoriaOpcional`), never the throwing `useAuth`/`useAuditoria`, for its own internal use.
- **Only user-triggered mutations are audited** — the async simulated DTE resolution (`resolverEmision`'s `setTimeout` callback in `ventas-context.tsx`) is NOT audited, only the click that triggered it (`crearVenta` / `reintentarEmision`).
- Mutators that need the "previous" value for their log message (e.g. `toggleActivoUsuario` needs to know if a user was active before toggling) must read state directly in the function body — never from inside a `setState` functional-updater callback — to avoid double-logging under React Strict Mode's dev-mode double-invocation of updater functions.
- `h-10` on all buttons (house rule, though this sub-project adds no new form buttons — the `/auditoria` page is read-only).
- No filters, no pagination, no export, no persistence across reloads — all explicitly out of scope per spec.

---

### Task 1: `AuditoriaProvider` + `AuthProvider` logging + root layout wiring

**Files:**
- Create: `src/lib/auditoria-context.tsx`
- Modify: `src/lib/auth-context.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces (from `src/lib/auditoria-context.tsx`): `AccionAuditoria` type (16-value union), `ACCION_LABELS: Record<AccionAuditoria, string>`, `EventoAuditoria` interface (`{ id: string; fecha: string; usuarioId: string | null; usuarioNombre: string; accion: AccionAuditoria; detalle: string }`), `AuditoriaProvider` component, `useAuditoria()` (throws if no ancestor — returns `{ eventos: EventoAuditoria[]; registrarEvento: (data: Omit<EventoAuditoria, "id" | "fecha">) => void }`), `useAuditoriaOpcional()` (returns the same shape or `null`, never throws). Task 2 consumes all of these.
- Produces (from `src/lib/auth-context.tsx`): new export `useAuthOpcional()` (returns `AuthContextValue | null`, never throws). Task 2 consumes this from `ventas-context.tsx`.

- [ ] **Step 1: Create `auditoria-context.tsx`**

Create `src/lib/auditoria-context.tsx`:

```tsx
"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

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
  | "usuario_desactivado";

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
};

export interface EventoAuditoria {
  id: string;
  fecha: string;
  usuarioId: string | null;
  usuarioNombre: string;
  accion: AccionAuditoria;
  detalle: string;
}

interface AuditoriaContextValue {
  eventos: EventoAuditoria[];
  registrarEvento: (data: Omit<EventoAuditoria, "id" | "fecha">) => void;
}

const AuditoriaContext = createContext<AuditoriaContextValue | null>(null);

export function AuditoriaProvider({ children }: { children: ReactNode }) {
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);

  const registrarEvento = useCallback((data: Omit<EventoAuditoria, "id" | "fecha">) => {
    const evento: EventoAuditoria = {
      ...data,
      id: crypto.randomUUID(),
      fecha: new Date().toISOString(),
    };
    setEventos((prev) => [evento, ...prev]);
  }, []);

  return (
    <AuditoriaContext.Provider value={{ eventos, registrarEvento }}>
      {children}
    </AuditoriaContext.Provider>
  );
}

export function useAuditoria() {
  const ctx = useContext(AuditoriaContext);
  if (!ctx) throw new Error("useAuditoria debe usarse dentro de AuditoriaProvider");
  return ctx;
}

export function useAuditoriaOpcional() {
  return useContext(AuditoriaContext);
}
```

- [ ] **Step 2: Add logging to `AuthProvider`**

Replace the full contents of `src/lib/auth-context.tsx`:

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usuariosSeed, type Usuario } from "@/lib/mock-data/usuarios";
import { useAuditoria } from "@/lib/auditoria-context";

const SESSION_KEY = "gotham_sesion";

interface AuthContextValue {
  usuarioActual: Usuario | null;
  usuarios: Usuario[];
  cargando: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  crearUsuario: (data: Omit<Usuario, "id" | "activo">) => Usuario;
  actualizarUsuario: (id: string, data: Partial<Omit<Usuario, "id">>) => void;
  toggleActivoUsuario: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { registrarEvento } = useAuditoria();
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosSeed);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const id = window.localStorage.getItem(SESSION_KEY);
    if (id) {
      const usuario = usuariosSeed.find((u) => u.id === id);
      if (usuario) {
        setUsuarioActual(usuario);
      } else {
        window.localStorage.removeItem(SESSION_KEY);
      }
    }
    setCargando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    (email: string, password: string) => {
      const usuario = usuarios.find(
        (u) =>
          u.email.toLowerCase() === email.trim().toLowerCase() &&
          u.password === password &&
          u.activo
      );
      if (!usuario) return false;
      window.localStorage.setItem(SESSION_KEY, usuario.id);
      setUsuarioActual(usuario);
      registrarEvento({
        usuarioId: usuario.id,
        usuarioNombre: usuario.nombre,
        accion: "login",
        detalle: `${usuario.nombre} inició sesión`,
      });
      return true;
    },
    [usuarios, registrarEvento]
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    if (usuarioActual) {
      registrarEvento({
        usuarioId: usuarioActual.id,
        usuarioNombre: usuarioActual.nombre,
        accion: "logout",
        detalle: `${usuarioActual.nombre} cerró sesión`,
      });
    }
    setUsuarioActual(null);
  }, [usuarioActual, registrarEvento]);

  const crearUsuario = useCallback(
    (data: Omit<Usuario, "id" | "activo">) => {
      const nuevo: Usuario = { ...data, id: crypto.randomUUID(), activo: true };
      setUsuarios((prev) => [...prev, nuevo]);
      registrarEvento({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: "usuario_creado",
        detalle: `Usuario "${nuevo.nombre}" creado con rol ${nuevo.rol}`,
      });
      return nuevo;
    },
    [usuarioActual, registrarEvento]
  );

  const actualizarUsuario = useCallback(
    (id: string, data: Partial<Omit<Usuario, "id">>) => {
      const usuario = usuarios.find((u) => u.id === id);
      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
      if (usuario) {
        registrarEvento({
          usuarioId: usuarioActual?.id ?? null,
          usuarioNombre: usuarioActual?.nombre ?? "Sistema",
          accion: "usuario_actualizado",
          detalle: `Usuario "${usuario.nombre}" actualizado`,
        });
      }
    },
    [usuarios, usuarioActual, registrarEvento]
  );

  const toggleActivoUsuario = useCallback(
    (id: string) => {
      const usuario = usuarios.find((u) => u.id === id);
      if (!usuario) return;
      const nuevoActivo = !usuario.activo;
      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, activo: nuevoActivo } : u)));
      registrarEvento({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: nuevoActivo ? "usuario_activado" : "usuario_desactivado",
        detalle: `Usuario "${usuario.nombre}" ${nuevoActivo ? "activado" : "desactivado"}`,
      });
    },
    [usuarios, usuarioActual, registrarEvento]
  );

  return (
    <AuthContext.Provider
      value={{
        usuarioActual,
        usuarios,
        cargando,
        login,
        logout,
        crearUsuario,
        actualizarUsuario,
        toggleActivoUsuario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

export function useAuthOpcional() {
  return useContext(AuthContext);
}
```

- [ ] **Step 3: Wire `AuditoriaProvider` into the root layout**

In `src/app/layout.tsx`, add the import:

```ts
import { AuditoriaProvider } from "@/lib/auditoria-context";
```

Change the provider nesting in the `<body>`:

```tsx
        <AuditoriaProvider>
          <AuthProvider>
            <VentasProvider>{children}</VentasProvider>
          </AuthProvider>
        </AuditoriaProvider>
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all 8 files, 31 tests pass. No test renders `AuthProvider` directly (confirmed by grep before writing this plan — only page/component files under `src/app` and `src/components/layout` reference `useAuth`/`login`/`usuariosSeed`, none of them test files), so `AuthProvider`'s new `useAuditoria()` call (which throws without an `AuditoriaProvider` ancestor) breaks nothing.

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: succeeds, no type errors. The app still loads and login/logout still function (no visible audit UI yet — that's Task 2).

- [ ] **Step 6: Commit**

```bash
git add src/lib/auditoria-context.tsx src/lib/auth-context.tsx src/app/layout.tsx
git commit -m "feat: add auditoria context and instrument AuthProvider"
```

---

### Task 2: Instrument `VentasProvider` + `/auditoria` page + sidebar nav item

**Files:**
- Modify: `src/lib/ventas-context.tsx`
- Create: `src/app/(app)/auditoria/page.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`

**Interfaces:**
- Consumes: `useAuditoriaOpcional`, `ACCION_LABELS`, `AccionAuditoria` from `@/lib/auditoria-context` (Task 1); `useAuthOpcional` from `@/lib/auth-context` (Task 1); `useAuditoria` (throwing variant, used by the new page) from `@/lib/auditoria-context` (Task 1).

- [ ] **Step 1: Instrument every user-triggered mutator in `VentasProvider`**

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
import type { Cliente, Factura, LineaVenta, MetodoPago, Producto, Venta } from "@/lib/types";
import { clientesSeed, facturasSeed, productosSeed, ventasSeed } from "@/lib/mock-data/seed";
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
  ventas: Venta[];
  facturas: Factura[];
  buscarClientes: (query: string) => Cliente[];
  buscarClientePorNit: (nit: string) => Cliente | undefined;
  registrarCliente: (data: Omit<Cliente, "id">) => Cliente;
  buscarProductos: (query: string) => Producto[];
  crearProducto: (data: Omit<Producto, "id">) => Producto;
  actualizarProducto: (id: string, data: Partial<Omit<Producto, "id">>) => void;
  toggleActivoProducto: (id: string) => void;
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
        ventas,
        facturas,
        buscarClientes,
        buscarClientePorNit,
        registrarCliente,
        buscarProductos,
        crearProducto,
        actualizarProducto,
        toggleActivoProducto,
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
Expected: all 8 files, 31 tests pass. The 5 files that render `<VentasProvider>` standalone (listed in Global Constraints) must show no failures — `useAuthOpcional()`/`useAuditoriaOpcional()` return `null` when there's no ancestor provider, so `usuarioActual` is `null`, `registrarEvento` is `undefined`, and every `registrarEvento?.(...)` call is silently skipped.

- [ ] **Step 3: Create the `/auditoria` page**

Create `src/app/(app)/auditoria/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAuditoria, ACCION_LABELS } from "@/lib/auditoria-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AuditoriaPage() {
  const { usuarioActual } = useAuth();
  const router = useRouter();
  const { eventos } = useAuditoria();

  useEffect(() => {
    if (usuarioActual && usuarioActual.rol !== "administrador") {
      router.replace("/");
    }
  }, [usuarioActual, router]);

  if (!usuarioActual || usuarioActual.rol !== "administrador") {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink-900">Auditoría</h1>

      {eventos.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-slate-500">
          Sin eventos todavía.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventos.map((evento) => (
                <TableRow key={evento.id}>
                  <TableCell className="text-xs">
                    {new Date(evento.fecha).toLocaleString("es-SV")}
                  </TableCell>
                  <TableCell>{evento.usuarioNombre}</TableCell>
                  <TableCell>{ACCION_LABELS[evento.accion]}</TableCell>
                  <TableCell className="text-sm text-slate-600">{evento.detalle}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add the "Auditoría" sidebar nav item**

In `src/components/layout/app-sidebar.tsx`, add `History` to the lucide-react import:

```ts
import {
  BarChart3,
  ClipboardCheck,
  History,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
```

Add a new entry to `NAV_ITEMS`, after the "Seguridad" line:

```ts
  { href: "/seguridad", label: "Seguridad", icon: ShieldCheck, enabled: true, roles: ["administrador"] },
  { href: "/auditoria", label: "Auditoría", icon: History, enabled: true, roles: ["administrador"] },
```

- [ ] **Step 5: Run the full test suite again**

Run: `npm test`
Expected: all 8 files, 31 tests pass (this step's changes have no dedicated test coverage).

- [ ] **Step 6: Verify the build**

Run: `npm run build`
Expected: succeeds, route list includes `/auditoria`.

- [ ] **Step 7: Manual verification with Playwright**

With the dev server running:

1. Log in as Ana (vendedor) via quick-login. Create a venta (cliente + producto + método de pago), let it reach "Autorizada". Solicitar anulación with a motivo. Log out.
2. Log in as Carlos (supervisor). Approve that anulación at `/aprobaciones`. Log out.
3. Log in as Lucía (administrador). Go to "Auditoría" in the sidebar (confirm it's a new item, not "Pronto").
4. Confirm the table shows, most-recent-first: Lucía's login, Carlos's anulación approval, Carlos's logout, Ana's anulación request, Ana's venta creation, Ana's login — each with the correct `usuarioNombre` and a readable `detalle` string matching what happened.
5. As Lucía, create a new producto at `/catalogos`. Confirm a "Producto creado" event appears at the top of `/auditoria` with Lucía as the actor.
6. As Lucía, create a new usuario at `/seguridad`. Confirm a "Usuario creado" event appears with Lucía as the actor.
7. Log in as Ana (vendedor), confirm "Auditoría" doesn't appear in her sidebar, and confirm navigating directly to `http://localhost:3000/auditoria` redirects to `/`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/ventas-context.tsx "src/app/(app)/auditoria/page.tsx" src/components/layout/app-sidebar.tsx
git commit -m "feat: instrument ventas mutators and add auditoria page"
```

---

## Manual verification (after Task 2)

Re-run Task 2 Step 7 once more end-to-end as a final sanity pass. Confirm `npm test` (8 files, 31 tests) and `npm run build` both stay green. This is the 8th sub-project (POS, Auth+Roles, Anulación con Supervisor, Catálogos, Reportes, Pagos, Seguridad, Auditoría). Remaining known gap from the original diagrams: Catálogo Fiscal (tipos de impuesto administrables).
