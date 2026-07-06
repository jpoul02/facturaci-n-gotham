# Seguridad — Gestión de Accesos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the `/seguridad` admin page (RF-A01) with real CRUD over users — create, edit, activate/deactivate — replacing the static 3-user seed array with mutable state that `login` reads from.

**Architecture:** `Usuario` gains an `activo` field. `AuthProvider` becomes the owner of a mutable `usuarios` list (mirroring how `VentasProvider` owns `productos`), exposing `crearUsuario`/`actualizarUsuario`/`toggleActivoUsuario` alongside the existing `login`/`logout`. A new `/seguridad` page (admin-only, same guard pattern as `/catalogos`) lists users in a table and opens a `UsuarioDialog` for create/edit, with a `RolSelector` toggle-button group for the 3 fixed roles.

**Tech Stack:** Next.js 16 App Router, React 19, existing `AuthProvider`/`useAuth` context, existing shadcn `Table`/`Dialog`/`Input`/`Label`/`Button`.

## Global Constraints

- **No automated tests for new behavior** — explicit user request, same as prior sub-projects. Verify with `npm run build` + manual Playwright pass.
- `h-10` on all form/filter buttons (house rule, no exception).
- Rol is a fixed 3-value union (`"vendedor" | "supervisor" | "administrador"`) — use a toggle-button group (same pattern as `MetodoPagoSelector`), not a search combobox, since it's not an entity lookup.
- Admin cannot deactivate their own account — the "Desactivar" button on the current user's own row is disabled, not hidden (more discoverable), with `title="No podés desactivar tu propia cuenta"`.
- `login/page.tsx`'s "Acceso rápido de prueba" buttons keep importing the static `usuariosSeed` array directly — they always show exactly the 3 original seed users, unaffected by admin-created ones. Do not change `login/page.tsx` in this plan.
- Editing a user's password is optional — an empty password field on edit means "don't change the password." Creating a user requires a non-empty password.
- No email-duplicate validation, no password hashing, no session invalidation on deactivation — all explicitly out of scope per spec.

---

### Task 1: Data model + mutable user state + CRUD in `AuthProvider`

**Files:**
- Modify: `src/lib/mock-data/usuarios.ts`
- Modify: `src/lib/auth-context.tsx`

**Interfaces:**
- Produces: `Usuario.activo: boolean` field, exported from `src/lib/mock-data/usuarios.ts`.
- Produces: `useAuth()` gains `usuarios: Usuario[]`, `crearUsuario(data: Omit<Usuario, "id" | "activo">): Usuario`, `actualizarUsuario(id: string, data: Partial<Omit<Usuario, "id">>): void`, `toggleActivoUsuario(id: string): void`. Task 2 consumes all four.
- `login`'s existing signature (`(email: string, password: string) => boolean`) is unchanged, but its behavior changes: it now reads from the live `usuarios` state (not the static `usuariosSeed` import) and additionally requires `usuario.activo === true`.

- [ ] **Step 1: Add `activo` to the `Usuario` interface and seed data**

In `src/lib/mock-data/usuarios.ts`, replace the full file contents:

```ts
export type Rol = "vendedor" | "supervisor" | "administrador";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  activo: boolean;
}

export const usuariosSeed: Usuario[] = [
  { id: "usr-1", nombre: "Ana Beltrán", email: "vendedor@gotham.sv", password: "vendedor123", rol: "vendedor", activo: true },
  { id: "usr-2", nombre: "Carlos Reyes", email: "supervisor@gotham.sv", password: "supervisor123", rol: "supervisor", activo: true },
  { id: "usr-3", nombre: "Lucía Hernández", email: "admin@gotham.sv", password: "admin123", rol: "administrador", activo: true },
];
```

- [ ] **Step 2: Make `usuarios` mutable state in `AuthProvider`, update `login`, add CRUD**

In `src/lib/auth-context.tsx`, replace the full file contents:

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
      return true;
    },
    [usuarios]
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    setUsuarioActual(null);
  }, []);

  const crearUsuario = useCallback((data: Omit<Usuario, "id" | "activo">) => {
    const nuevo: Usuario = { ...data, id: crypto.randomUUID(), activo: true };
    setUsuarios((prev) => [...prev, nuevo]);
    return nuevo;
  }, []);

  const actualizarUsuario = useCallback(
    (id: string, data: Partial<Omit<Usuario, "id">>) => {
      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
    },
    []
  );

  const toggleActivoUsuario = useCallback((id: string) => {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, activo: !u.activo } : u)));
  }, []);

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
```

Note: the session-restore `useEffect` on mount still reads from the static `usuariosSeed` (not the `usuarios` state) — this is correct and intentional, since it runs once on mount before any admin edits could have happened in that session, and avoids an unnecessary dependency on `usuarios` that would re-run the effect on every CRUD action.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all 8 files, 31 tests pass (no test file references `useAuth`, `login`, or `usuariosSeed` directly — confirmed by grep before writing this plan — so this task changes no tested behavior).

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: succeeds, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mock-data/usuarios.ts src/lib/auth-context.tsx
git commit -m "feat: make usuarios mutable state with CRUD in AuthProvider"
```

---

### Task 2: `RolSelector`, `UsuarioDialog`, `/seguridad` page, sidebar nav item

**Files:**
- Create: `src/components/seguridad/rol-selector.tsx`
- Create: `src/components/seguridad/usuario-dialog.tsx`
- Create: `src/app/(app)/seguridad/page.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`

**Interfaces:**
- Consumes: `useAuth()`'s `usuarios`, `usuarioActual`, `crearUsuario`, `actualizarUsuario`, `toggleActivoUsuario` (Task 1). `Rol`, `Usuario` types from `@/lib/mock-data/usuarios` (existing + Task 1's `activo` field).
- Produces: `ROL_LABELS: Record<Rol, string>` and `RolSelector` component, both exported from `src/components/seguridad/rol-selector.tsx`.

- [ ] **Step 1: Create `RolSelector`**

Create `src/components/seguridad/rol-selector.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import type { Rol } from "@/lib/mock-data/usuarios";

export const ROL_LABELS: Record<Rol, string> = {
  vendedor: "Vendedor",
  supervisor: "Supervisor",
  administrador: "Administrador",
};

const OPCIONES: Rol[] = ["vendedor", "supervisor", "administrador"];

interface RolSelectorProps {
  value: Rol | undefined;
  onChange: (rol: Rol) => void;
}

export function RolSelector({ value, onChange }: RolSelectorProps) {
  return (
    <div className="flex gap-2">
      {OPCIONES.map((rol) => (
        <Button
          key={rol}
          type="button"
          variant={value === rol ? "default" : "outline"}
          className="h-10 flex-1"
          onClick={() => onChange(rol)}
        >
          {ROL_LABELS[rol]}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `UsuarioDialog`**

Create `src/components/seguridad/usuario-dialog.tsx`:

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
import { RolSelector } from "@/components/seguridad/rol-selector";
import { useAuth } from "@/lib/auth-context";
import type { Rol, Usuario } from "@/lib/mock-data/usuarios";

interface UsuarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario?: Usuario;
}

export function UsuarioDialog({ open, onOpenChange, usuario }: UsuarioDialogProps) {
  const { crearUsuario, actualizarUsuario } = useAuth();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<Rol | undefined>(undefined);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setNombre(usuario?.nombre ?? "");
      setEmail(usuario?.email ?? "");
      setRol(usuario?.rol);
      setPassword("");
    }
  }, [open, usuario]);

  const puedeGuardar =
    nombre.trim() !== "" &&
    email.trim() !== "" &&
    rol !== undefined &&
    (usuario ? true : password.trim() !== "");

  const handleSubmit = () => {
    if (!puedeGuardar || !rol) return;
    if (usuario) {
      actualizarUsuario(usuario.id, {
        nombre: nombre.trim(),
        email: email.trim(),
        rol,
        ...(password.trim() !== "" && { password: password.trim() }),
      });
      toast.success("Usuario actualizado");
    } else {
      crearUsuario({
        nombre: nombre.trim(),
        email: email.trim(),
        rol,
        password: password.trim(),
      });
      toast.success("Usuario creado");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{usuario ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" className="h-10" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              className="h-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Rol</Label>
            <RolSelector value={rol} onChange={setRol} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              className="h-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={usuario ? "Dejar en blanco para no cambiar" : undefined}
            />
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

- [ ] **Step 3: Create the `/seguridad` page**

Create `src/app/(app)/seguridad/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UsuarioDialog } from "@/components/seguridad/usuario-dialog";
import { ROL_LABELS } from "@/components/seguridad/rol-selector";
import type { Usuario } from "@/lib/mock-data/usuarios";

export default function SeguridadPage() {
  const { usuarioActual, usuarios, toggleActivoUsuario } = useAuth();
  const router = useRouter();
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | undefined>(undefined);

  useEffect(() => {
    if (usuarioActual && usuarioActual.rol !== "administrador") {
      router.replace("/");
    }
  }, [usuarioActual, router]);

  if (!usuarioActual || usuarioActual.rol !== "administrador") {
    return null;
  }

  const abrirNuevo = () => {
    setUsuarioEditando(undefined);
    setDialogAbierto(true);
  };

  const abrirEditar = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setDialogAbierto(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Seguridad</h1>
        <Button className="h-10" onClick={abrirNuevo}>
          + Nuevo usuario
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((usuario) => {
              const esUsuarioActual = usuario.id === usuarioActual.id;
              return (
                <TableRow key={usuario.id}>
                  <TableCell>{usuario.nombre}</TableCell>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell>{ROL_LABELS[usuario.rol]}</TableCell>
                  <TableCell>{usuario.activo ? "Sí" : "No"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button className="h-10" variant="outline" onClick={() => abrirEditar(usuario)}>
                        Editar
                      </Button>
                      <Button
                        className="h-10"
                        variant="outline"
                        disabled={esUsuarioActual}
                        title={esUsuarioActual ? "No podés desactivar tu propia cuenta" : undefined}
                        onClick={() => toggleActivoUsuario(usuario.id)}
                      >
                        {usuario.activo ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <UsuarioDialog open={dialogAbierto} onOpenChange={setDialogAbierto} usuario={usuarioEditando} />
    </div>
  );
}
```

- [ ] **Step 4: Enable the sidebar nav item**

In `src/components/layout/app-sidebar.tsx`, find:

```ts
  { href: "/seguridad", label: "Seguridad", icon: ShieldCheck, enabled: false, roles: ["administrador"] },
```

Change `enabled: false` to `enabled: true`:

```ts
  { href: "/seguridad", label: "Seguridad", icon: ShieldCheck, enabled: true, roles: ["administrador"] },
```

Nothing else in this file changes.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all 8 files, 31 tests pass (this task adds no logic to any tested file — `app-sidebar.tsx`'s one-line change has no dedicated test).

- [ ] **Step 6: Verify the build**

Run: `npm run build`
Expected: succeeds, route list includes `/seguridad`.

- [ ] **Step 7: Manual verification with Playwright**

With the dev server running:

1. Log in as Lucía (administrador) via quick-login, go to "Seguridad" in the sidebar (confirm it's no longer "Pronto").
2. Confirm the table shows exactly 3 rows (Ana/vendedor, Carlos/supervisor, Lucía/administrador), all "Activo: Sí".
3. Confirm the "Desactivar" button on Lucía's own row is disabled.
4. Click "+ Nuevo usuario", create one with rol "vendedor", a distinct email/password, and confirm it appears in the table with "Activo: Sí".
5. Log out, log in with the new user's email/password (manual form, not quick-login), confirm successful login and correct role-gated sidebar.
6. Log out, log back in as Lucía. Click "Editar" on the new user, change rol to "supervisor", leave password blank, save. Confirm the table shows "Supervisor" for that row.
7. Log out, log in with the same user's *original* password (unchanged), confirm login still succeeds and the sidebar reflects the new "supervisor" role.
8. As Lucía, click "Desactivar" on that user's row. Confirm the table now shows "Activo: No" and the button now reads "Activar".
9. Log out, attempt to log in with that user's credentials, confirm it fails with "Correo o contraseña incorrectos."
10. Log in as Ana (vendedor) or Carlos (supervisor), confirm "Seguridad" doesn't appear in the sidebar, and confirm navigating directly to `http://localhost:3000/seguridad` redirects to `/`.

- [ ] **Step 8: Commit**

```bash
git add src/components/seguridad/rol-selector.tsx src/components/seguridad/usuario-dialog.tsx "src/app/(app)/seguridad/page.tsx" src/components/layout/app-sidebar.tsx
git commit -m "feat: add role-gated seguridad user management page"
```

---

## Manual verification (after Task 2)

Re-run Task 2 Step 7 once more end-to-end as a final sanity pass. Confirm `npm test` (8 files, 31 tests) and `npm run build` both stay green. This is the 7th sub-project (POS, Auth+Roles, Anulación con Supervisor, Catálogos, Reportes, Pagos, Seguridad) — now all three original roles' RF items are built except RF-A03 (Auditoría) and Catálogo Fiscal, both still pending as separate sub-projects.
