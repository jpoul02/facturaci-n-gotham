# Catálogos — CRUD de Productos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `productos` a real, mutable piece of state in the mock backend (fixing a pre-existing bug where it was a static re-export of the seed import), add create/update/toggle-active functions, and build an `administrador`-only `/catalogos` screen to use them.

**Architecture:** `ventas-context.tsx` gains a `productos` state (mirroring the existing `clientes` pattern) and three new functions. A new `ProductoDialog` component (mirrors the existing `ClienteNuevoDialog` pattern, reused for both create and edit) and a new page follow the same role-gating pattern already established by `/aprobaciones`.

**Tech Stack:** Next.js 16 App Router, React 19, existing `VentasProvider`/`useAuth` contexts, existing shadcn `Table`/`Dialog`/`Input`/`Label`/`Button` (no new shadcn components needed).

## Global Constraints

- **No automated tests for new behavior** — explicit user request, same as prior sub-projects. Verify with `npm run build` + manual Playwright pass. Exception: if any existing test breaks as a side effect, it must be fixed (same rule as before) — check for this in Task 1's verification step.
- No real delete — only activate/deactivate, matching the existing `activo` flag pattern.
- All buttons/inputs `h-10`.
- Price validation: must be a positive number; invalid shows inline error (not toast), Guardar button disabled.
- `/catalogos` needs a page-level role guard (redirect non-`administrador` to `/`), same pattern as `/aprobaciones` from the prior sub-project — not just sidebar-hidden.
- Reuse existing design tokens/components only — no new shadcn packages (in particular, no `Switch` component; use a labeled `Button` for the activate/deactivate action, exactly like the rest of this table's row actions).

---

### Task 1: `ventas-context.tsx` — stateful `productos` + CRUD functions

**Files:**
- Modify: `src/lib/ventas-context.tsx`

**Interfaces:**
- Produces: `crearProducto(data: Omit<Producto, "id">): Producto`, `actualizarProducto(id: string, data: Partial<Omit<Producto, "id">>): void`, `toggleActivoProducto(id: string): void` — all added to `useVentas()`'s return value. `productos` becomes a real state array (same type as before, `Producto[]`, no signature change for consumers).
- Consumed by: Task 2.

- [ ] **Step 1: Add `productos` as state**

Find:

```ts
  const [clientes, setClientes] = useState<Cliente[]>(clientesSeed);
  const [ventas, setVentas] = useState<Venta[]>(ventasSeed);
  const [facturas, setFacturas] = useState<Factura[]>(facturasSeed);
```

Replace with:

```ts
  const [clientes, setClientes] = useState<Cliente[]>(clientesSeed);
  const [productos, setProductos] = useState<Producto[]>(productosSeed);
  const [ventas, setVentas] = useState<Venta[]>(ventasSeed);
  const [facturas, setFacturas] = useState<Factura[]>(facturasSeed);
```

- [ ] **Step 2: Fix `buscarProductos` to read from state, add the three new functions**

Find:

```ts
  const buscarProductos = useCallback((query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return productosSeed.filter(
      (p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
    );
  }, []);
```

Replace with:

```ts
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

  const crearProducto = useCallback((data: Omit<Producto, "id">) => {
    const nuevo: Producto = { ...data, id: crypto.randomUUID() };
    setProductos((prev) => [...prev, nuevo]);
    return nuevo;
  }, []);

  const actualizarProducto = useCallback(
    (id: string, data: Partial<Omit<Producto, "id">>) => {
      setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    },
    []
  );

  const toggleActivoProducto = useCallback((id: string) => {
    setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, activo: !p.activo } : p)));
  }, []);
```

This changes `buscarProductos`'s dependency array from `[]` to `[productos]` — necessary now that it reads from state rather than the static import, otherwise it would keep returning stale results after any create/update/toggle.

- [ ] **Step 3: Update the interface and the provider's returned value**

In the `VentasContextValue` interface, find:

```ts
  productos: Producto[];
```

leave this line as-is (the type doesn't change), but add after `buscarProductos: (query: string) => Producto[];`:

```ts
  crearProducto: (data: Omit<Producto, "id">) => Producto;
  actualizarProducto: (id: string, data: Partial<Omit<Producto, "id">>) => void;
  toggleActivoProducto: (id: string) => void;
```

In the `<VentasContext.Provider value={{ ... }}>` object, find:

```ts
        clientes,
        productos: productosSeed,
        ventas,
```

Replace with:

```ts
        clientes,
        productos,
        ventas,
```

(this is the actual bug fix — `productos` now refers to the stateful variable, not the static seed import), and add after `buscarProductos,`:

```ts
        crearProducto,
        actualizarProducto,
        toggleActivoProducto,
```

- [ ] **Step 4: Run the full test suite and build**

Run: `npm test`
Expected: all 8 files, 31 tests still pass (this task doesn't change any test-covered behavior — `carrito-builder.test.tsx` and `pos-flow.test.tsx` both search for products that exist in the seed data from the very first render, which is unchanged; only the *mutability* of the underlying array changed).

Run: `npm run build`
Expected: succeeds.

If either fails, that means this change had an unexpected side effect — investigate before proceeding, don't just note it and move on (unlike some deviations in prior sub-projects, this task's brief doesn't have a known/expected breakage to defer).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ventas-context.tsx
git commit -m "fix: make productos stateful and add crearProducto/actualizarProducto/toggleActivoProducto"
```

---

### Task 2: `/catalogos` page (role-gated) + `ProductoDialog` + sidebar nav item

**Files:**
- Create: `src/components/catalogos/producto-dialog.tsx`
- Create: `src/app/(app)/catalogos/page.tsx`
- Modify: `src/components/layout/app-sidebar.tsx` (one line: `enabled: false` → `enabled: true` on the Catálogos entry)

**Interfaces:**
- Consumes: `useAuth()` from `@/lib/auth-context` (existing), `useVentas()`'s `productos`, `crearProducto`, `actualizarProducto`, `toggleActivoProducto` (Task 1), `Producto` type from `@/lib/types` (existing).

- [ ] **Step 1: Enable the sidebar nav item**

In `src/components/layout/app-sidebar.tsx`, find the `NAV_ITEMS` entry for Catálogos:

```ts
  { href: "/catalogos", label: "Catálogos", icon: Settings, enabled: false, roles: ["administrador"] },
```

Change `enabled: false` to `enabled: true`:

```ts
  { href: "/catalogos", label: "Catálogos", icon: Settings, enabled: true, roles: ["administrador"] },
```

Nothing else in this file changes.

- [ ] **Step 2: Write `ProductoDialog`**

```tsx
// src/components/catalogos/producto-dialog.tsx
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

  useEffect(() => {
    if (open) {
      setNombre(producto?.nombre ?? "");
      setCodigo(producto?.codigo ?? "");
      setPrecio(producto ? String(producto.precio) : "");
      setTipo(producto?.tipo ?? "");
    }
  }, [open, producto]);

  const precioNumero = Number(precio);
  const precioValido = precio.trim() !== "" && !Number.isNaN(precioNumero) && precioNumero > 0;
  const puedeGuardar =
    nombre.trim() !== "" && codigo.trim() !== "" && tipo.trim() !== "" && precioValido;

  const handleSubmit = () => {
    if (!puedeGuardar) return;
    if (producto) {
      actualizarProducto(producto.id, {
        nombre: nombre.trim(),
        codigo: codigo.trim(),
        precio: precioNumero,
        tipo: tipo.trim(),
      });
      toast.success("Producto actualizado");
    } else {
      crearProducto({
        nombre: nombre.trim(),
        codigo: codigo.trim(),
        precio: precioNumero,
        tipo: tipo.trim(),
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

- [ ] **Step 3: Write the `/catalogos` page**

```tsx
// src/app/(app)/catalogos/page.tsx
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
import type { Producto } from "@/lib/types";

export default function CatalogosPage() {
  const { usuarioActual } = useAuth();
  const router = useRouter();
  const { productos, toggleActivoProducto } = useVentas();
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | undefined>(undefined);

  useEffect(() => {
    if (usuarioActual && usuarioActual.rol !== "administrador") {
      router.replace("/");
    }
  }, [usuarioActual, router]);

  if (!usuarioActual || usuarioActual.rol !== "administrador") {
    return null;
  }

  const abrirNuevo = () => {
    setProductoEditando(undefined);
    setDialogAbierto(true);
  };

  const abrirEditar = (producto: Producto) => {
    setProductoEditando(producto);
    setDialogAbierto(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Catálogos</h1>
        <Button className="h-10" onClick={abrirNuevo}>
          + Nuevo producto
        </Button>
      </div>

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
                    <Button className="h-10" variant="outline" onClick={() => abrirEditar(producto)}>
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

      <ProductoDialog open={dialogAbierto} onOpenChange={setDialogAbierto} producto={productoEditando} />
    </div>
  );
}
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: succeeds, route list includes `/catalogos`.

- [ ] **Step 5: Manual verification with Playwright**

With the dev server running:

1. Log in as Lucía (administrador, quick-login button).
2. Go to `/catalogos`, confirm the seeded products (Cemento Fortaleza, Varilla de hierro, Pintura látex, Taladro inalámbrico, Servicio de instalación, and "Cinta métrica 5m (descontinuada)" showing "No" in the Activo column) all appear.
3. Click "+ Nuevo producto", fill in a new product (e.g. nombre "Casco de seguridad", código "P-007", precio "12.50", tipo "Herramienta"), save. Confirm it appears in the table.
4. Go to `/ventas/nueva`, search for "Casco" in the product search, confirm it appears and can be added to the cart with the correct price.
5. Back on `/catalogos`, click "Editar" on that same product, change the price to "15.00", save. Confirm the table shows the new price.
6. Click "Desactivar" on that product. Confirm the Activo column flips to "No" and the button now says "Activar".
7. Go to `/ventas/nueva` again, search for "Casco" — confirm it still appears in the search results but is blocked with the existing "no disponible" inline message when clicked (this is `CarritoBuilder`'s pre-existing behavior for inactive products — you are not changing it, just confirming it still applies to a product that was deactivated through this new UI).
8. Log in as Ana (vendedor) and try navigating directly to `http://localhost:3000/catalogos` — confirm it redirects to `/`.

- [ ] **Step 6: Commit**

```bash
git add src/components/catalogos/producto-dialog.tsx "src/app/(app)/catalogos/page.tsx" src/components/layout/app-sidebar.tsx
git commit -m "feat: add role-gated catalogos CRUD page"
```

---

## Manual verification (after Task 2)

Re-run Task 2 Step 5 once more end-to-end as a final sanity pass, and confirm `npm test` (8 files, 31 tests) and `npm run build` both stay green.
