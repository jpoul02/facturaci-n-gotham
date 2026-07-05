# Anulación con Aprobación de Supervisor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the reserved `anulacion_solicitada` state so cancellation requests go through a Supervisor/Administrador approval step instead of cancelling instantly, with a new `/aprobaciones` screen for that approval.

**Architecture:** Three functions in the existing `ventas-context.tsx` mock backend (`solicitarAnulacion` changes its target state; two new functions `aprobarAnulacion`/`rechazarAnulacion` are added), a new page gated by role (not just nav visibility — the first page-level role guard in this project), and a small addition to the existing venta detail page for the pending state.

**Tech Stack:** Next.js 16 App Router, React 19, existing `VentasProvider`/`useAuth` contexts, existing shadcn `Table`/`Button`.

## Global Constraints

- **No automated tests for NEW behavior** — explicit user request, same as the auth+roles plan. Verify with `npm run build` + manual Playwright pass.
- **Exception:** one pre-existing test in `src/lib/ventas-context.test.tsx` currently asserts `solicitarAnulacion` sets `estado` to `"anulada"` — that assertion becomes wrong once this plan lands (the whole point is that it no longer does that directly) and MUST be updated to match the new, intentional behavior. This is fixing a test to match a deliberate behavior change, not writing new test coverage — do not skip it, the full suite must stay green.
- Reuse existing design tokens only (`bg-ink-900`, `bg-brand-600`, `border-pending-700/30`, `bg-pending-700/5`, `text-pending-700`, `border-error-700/30` pattern already used for the `error_dte` banner).
- All buttons `h-10`.
- `vendedorId`/ownership of a venta is explicitly out of scope — anyone logged in can still call `solicitarAnulacion`, same as today.

---

### Task 1: `ventas-context.tsx` — activate `anulacion_solicitada`, add approve/reject

**Files:**
- Modify: `src/lib/ventas-context.tsx:122-128` (the `solicitarAnulacion` function) and `:21-36` (the `VentasContextValue` interface) and `:148-169` (the provider's returned value object)
- Modify: `src/lib/ventas-context.test.tsx:89-100` (the existing `solicitarAnulacion` test)

**Interfaces:**
- Produces: `aprobarAnulacion(ventaId: string): void`, `rechazarAnulacion(ventaId: string): void` added to `useVentas()`'s return value. `solicitarAnulacion`'s behavior changes (same signature, different resulting `estado`).
- Consumed by: Tasks 2, 3.

- [ ] **Step 1: Change `solicitarAnulacion`'s target state**

In `src/lib/ventas-context.tsx`, find:

```ts
  const solicitarAnulacion = useCallback((ventaId: string, motivo: string) => {
    setVentas((prev) =>
      prev.map((v) =>
        v.id === ventaId ? { ...v, estado: "anulada", motivoAnulacion: motivo } : v
      )
    );
  }, []);
```

Replace with:

```ts
  const solicitarAnulacion = useCallback((ventaId: string, motivo: string) => {
    setVentas((prev) =>
      prev.map((v) =>
        v.id === ventaId ? { ...v, estado: "anulacion_solicitada", motivoAnulacion: motivo } : v
      )
    );
  }, []);

  const aprobarAnulacion = useCallback((ventaId: string) => {
    setVentas((prev) =>
      prev.map((v) => (v.id === ventaId ? { ...v, estado: "anulada" } : v))
    );
  }, []);

  const rechazarAnulacion = useCallback((ventaId: string) => {
    setVentas((prev) =>
      prev.map((v) =>
        v.id === ventaId ? { ...v, estado: "autorizada", motivoAnulacion: undefined } : v
      )
    );
  }, []);
```

- [ ] **Step 2: Add the two new functions to the context's public interface and provider value**

In the `VentasContextValue` interface, add after `solicitarAnulacion: (ventaId: string, motivo: string) => void;`:

```ts
  aprobarAnulacion: (ventaId: string) => void;
  rechazarAnulacion: (ventaId: string) => void;
```

In the `<VentasContext.Provider value={{ ... }}>` object, add after `solicitarAnulacion,`:

```ts
        aprobarAnulacion,
        rechazarAnulacion,
```

- [ ] **Step 3: Fix the now-outdated existing test**

In `src/lib/ventas-context.test.tsx`, find:

```tsx
  it("solicitarAnulacion marca la venta como anulada con motivo", () => {
    __setRandomForTesting(() => 0.9);
    const { result } = renderHook(() => useVentas(), { wrapper });
    let ventaId = "";
    act(() => {
      ventaId = result.current.crearVenta("cli-1", [lineaEjemplo]);
    });
    act(() => {
      result.current.solicitarAnulacion(ventaId, "Cliente se arrepintió");
    });
    expect(result.current.getVenta(ventaId)?.estado).toBe("anulada");
    expect(result.current.getVenta(ventaId)?.motivoAnulacion).toBe("Cliente se arrepintió");
  });
```

Replace with (renamed to reflect what it now verifies, plus two new small cases for the approve/reject transitions using the same `wrapper`/`lineaEjemplo` already defined earlier in this file — do not redefine them, they're already in scope):

```tsx
  it("solicitarAnulacion marca la venta como anulacion_solicitada con motivo", () => {
    __setRandomForTesting(() => 0.9);
    const { result } = renderHook(() => useVentas(), { wrapper });
    let ventaId = "";
    act(() => {
      ventaId = result.current.crearVenta("cli-1", [lineaEjemplo]);
    });
    act(() => {
      result.current.solicitarAnulacion(ventaId, "Cliente se arrepintió");
    });
    expect(result.current.getVenta(ventaId)?.estado).toBe("anulacion_solicitada");
    expect(result.current.getVenta(ventaId)?.motivoAnulacion).toBe("Cliente se arrepintió");
  });

  it("aprobarAnulacion marca la venta como anulada", () => {
    __setRandomForTesting(() => 0.9);
    const { result } = renderHook(() => useVentas(), { wrapper });
    let ventaId = "";
    act(() => {
      ventaId = result.current.crearVenta("cli-1", [lineaEjemplo]);
    });
    act(() => {
      result.current.solicitarAnulacion(ventaId, "Cliente se arrepintió");
      result.current.aprobarAnulacion(ventaId);
    });
    expect(result.current.getVenta(ventaId)?.estado).toBe("anulada");
  });

  it("rechazarAnulacion devuelve la venta a autorizada y limpia el motivo", () => {
    __setRandomForTesting(() => 0.9);
    const { result } = renderHook(() => useVentas(), { wrapper });
    let ventaId = "";
    act(() => {
      ventaId = result.current.crearVenta("cli-1", [lineaEjemplo]);
    });
    act(() => {
      result.current.solicitarAnulacion(ventaId, "Cliente se arrepintió");
      result.current.rechazarAnulacion(ventaId);
    });
    expect(result.current.getVenta(ventaId)?.estado).toBe("autorizada");
    expect(result.current.getVenta(ventaId)?.motivoAnulacion).toBeUndefined();
  });
```

- [ ] **Step 4: Run the updated test file**

Run: `npx vitest run src/lib/ventas-context.test.tsx`
Expected: PASS (7 tests — the 4 pre-existing ones unaffected by this change, plus the 3 in this file after the edit).

- [ ] **Step 5: Run the full suite and build**

Run: `npm test`
Expected: all 8 test files pass (test count will be 31, up from 29, since Step 3 replaced 1 test with 3).

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ventas-context.tsx src/lib/ventas-context.test.tsx
git commit -m "feat: route anulacion through anulacion_solicitada with approve/reject"
```

---

### Task 2: `/aprobaciones` page (role-gated) + sidebar nav item

**Files:**
- Create: `src/app/(app)/aprobaciones/page.tsx`
- Modify: `src/components/layout/app-sidebar.tsx:5-34` (imports and `NAV_ITEMS`)

**Interfaces:**
- Consumes: `useAuth()` from `@/lib/auth-context` (existing), `useVentas()`'s `ventas`, `getClientePorId`, `aprobarAnulacion`, `rechazarAnulacion` (Task 1).

- [ ] **Step 1: Add the sidebar nav item**

In `src/components/layout/app-sidebar.tsx`, change the lucide-react import line:

```ts
import {
  BarChart3,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
```

And update `NAV_ITEMS` (insert the new item between `Ventas` and `Reportes`, keep everything else identical):

```ts
const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, enabled: true, roles: TODOS_LOS_ROLES },
  { href: "/ventas", label: "Ventas", icon: Receipt, enabled: true, roles: TODOS_LOS_ROLES },
  { href: "/aprobaciones", label: "Aprobaciones", icon: ClipboardCheck, enabled: true, roles: ["supervisor", "administrador"] },
  { href: "/reportes", label: "Reportes", icon: BarChart3, enabled: false, roles: ["supervisor", "administrador"] },
  { href: "/catalogos", label: "Catálogos", icon: Settings, enabled: false, roles: ["administrador"] },
  { href: "/seguridad", label: "Seguridad", icon: ShieldCheck, enabled: false, roles: ["administrador"] },
];
```

Nothing else in the file changes — the existing filter-by-role logic (`itemsVisibles`) already handles this correctly since it just filters `NAV_ITEMS` by `roles.includes(usuarioActual.rol)`.

- [ ] **Step 2: Write the `/aprobaciones` page**

```tsx
// src/app/(app)/aprobaciones/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

export default function AprobacionesPage() {
  const { usuarioActual } = useAuth();
  const router = useRouter();
  const { ventas, getClientePorId, aprobarAnulacion, rechazarAnulacion } = useVentas();

  useEffect(() => {
    if (usuarioActual && usuarioActual.rol === "vendedor") {
      router.replace("/");
    }
  }, [usuarioActual, router]);

  if (!usuarioActual || usuarioActual.rol === "vendedor") {
    return null;
  }

  const solicitudes = ventas.filter((v) => v.estado === "anulacion_solicitada");

  const handleAprobar = (ventaId: string) => {
    aprobarAnulacion(ventaId);
    toast.success("Anulación aprobada");
  };

  const handleRechazar = (ventaId: string) => {
    rechazarAnulacion(ventaId);
    toast.success("Anulación rechazada");
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink-900">Aprobaciones</h1>

      <div className="overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {solicitudes.map((venta) => {
              const cliente = getClientePorId(venta.clienteId);
              return (
                <TableRow key={venta.id}>
                  <TableCell>{cliente?.nombre ?? "—"}</TableCell>
                  <TableCell className="font-mono">${venta.total.toFixed(2)}</TableCell>
                  <TableCell className="max-w-xs truncate">{venta.motivoAnulacion}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button className="h-10" variant="outline" onClick={() => handleRechazar(venta.id)}>
                        Rechazar
                      </Button>
                      <Button className="h-10" onClick={() => handleAprobar(venta.id)}>
                        Aprobar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {solicitudes.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-slate-500">
                  No hay solicitudes pendientes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: succeeds, route list includes `/aprobaciones`.

- [ ] **Step 4: Manual verification with Playwright**

Start the dev server. Log in as Lucía (administrador) or Carlos (supervisor) via the quick-login button, navigate to `/aprobaciones`, confirm the empty state ("No hay solicitudes pendientes.") renders. Then log in as Ana (vendedor) and try navigating directly to `http://localhost:3000/aprobaciones` — confirm it redirects to `/` (the role guard). Confirm "Aprobaciones" does not appear at all in Ana's sidebar.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/aprobaciones/page.tsx" src/components/layout/app-sidebar.tsx
git commit -m "feat: add role-gated aprobaciones page and sidebar nav item"
```

---

### Task 3: Venta detail — pending-approval banner + end-to-end verification

**Files:**
- Modify: `src/components/ventas/venta-detail-client.tsx:44-51` (add a new conditional block right after the existing `error_dte` banner block)

**Interfaces:**
- Consumes: `aprobarAnulacion`/`rechazarAnulacion` (Task 1, exercised via `/aprobaciones` from Task 2 — not called directly from this file), `Venta.motivoAnulacion` (existing type).

- [ ] **Step 1: Add the pending-approval banner**

In `src/components/ventas/venta-detail-client.tsx`, right after the existing block:

```tsx
      {venta.estado === "error_dte" && (
        <div className="flex items-center justify-between rounded-md border border-error-700/30 bg-error-700/5 px-4 py-3">
          <p className="text-sm text-error-700">El Nodo Fiscal rechazó la emisión de este comprobante.</p>
          <Button className="h-10" variant="outline" onClick={() => reintentarEmision(ventaId)}>
            Reintentar emisión
          </Button>
        </div>
      )}
```

add:

```tsx
      {venta.estado === "anulacion_solicitada" && (
        <div className="rounded-md border border-pending-700/30 bg-pending-700/5 px-4 py-3">
          <p className="text-sm text-pending-700">
            Anulación solicitada, esperando aprobación del supervisor.
          </p>
          {venta.motivoAnulacion && (
            <p className="mt-1 text-sm text-slate-500">Motivo: {venta.motivoAnulacion}</p>
          )}
        </div>
      )}
```

Nothing else in the file changes — the existing "Solicitar anulación" button only shows for `estado === "autorizada"`, so once a request is made and the state moves to `anulacion_solicitada`, that button naturally disappears without any extra code.

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Full end-to-end manual verification with Playwright**

With the dev server running:

1. Log in as Ana (vendedor, quick-login button).
2. Go to `/ventas/nueva`, complete a sale (pick a client, add a product, confirm) — wait for it to reach "Autorizada" (may need a retry if it hits the ~5% simulated DTE error).
3. On the venta detail page, click "Solicitar anulación", type a motivo, confirm. Confirm the sello disappears and is replaced by the new pending-approval pill/banner showing the motivo, and the "Solicitar anulación" button is gone.
4. Click "Cerrar sesión", log in as Carlos (supervisor).
5. Go to `/aprobaciones` — confirm the venta from step 2 appears with the correct cliente name, total, and motivo.
6. Click "Aprobar". Confirm the row disappears from `/aprobaciones` (empty-state message reappears if it was the only one) and a success toast shows.
7. Navigate to that venta's detail page directly (note its id/correlativo from step 3) — confirm it now shows the "Anulada" sello and the motivo line.
8. Repeat steps 2-5 with a second sale, but click "Rechazar" instead — confirm the venta's detail page shows the "Autorizada" sello again (not a pill), with no anulación banner.

- [ ] **Step 4: Commit**

```bash
git add src/components/ventas/venta-detail-client.tsx
git commit -m "feat: show pending-approval banner on venta detail for anulacion_solicitada"
```

---

## Manual verification (after Task 3)

Re-run the full Task 3 Step 3 script once more end-to-end as a final sanity pass, and confirm `npm test` (8 test files, 31 tests) and `npm run build` both stay green.
