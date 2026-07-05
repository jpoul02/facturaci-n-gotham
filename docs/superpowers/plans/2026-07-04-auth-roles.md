# Autenticación + Roles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mock login (3 hardcoded users, one per role), a `localStorage`-backed session, a route-group-based auth guard protecting the existing app pages, and a sidebar that filters its nav items by the logged-in user's role.

**Architecture:** A `AuthProvider` React Context (mirrors the existing `VentasProvider` pattern) reads/writes a single `localStorage` key holding the current user's id. The existing app pages move under a Next.js route group `(app)` whose layout renders `AppShell` only when a session exists, otherwise redirects to `/login`. `AppSidebar` filters its existing `NAV_ITEMS` array by role and gains a footer with the current user's name/role and a logout button.

**Tech Stack:** Next.js 16 App Router (route groups), React 19 Context, `localStorage`, existing shadcn `Button`/`Input`/`Label`.

## Global Constraints

- **No automated tests for this plan** — explicit user request ("omití pruebas, ocupo el trabajo rápido"). Verify each task with `npm run build` plus a manual Playwright screenshot pass through the actual flow (documented per task below), not Vitest.
- All form buttons/inputs use `h-10`.
- Frontend only — no real backend, no password hashing. Mock credential check against a fixed in-memory list.
- Session key: `localStorage` key `gotham_sesion` — copy it verbatim in every task that reads/writes it, don't rename.
- Reuse existing design tokens only: `bg-ink-900`, `bg-canvas`, `bg-brand-600`, `text-error-700`, `border-white/10` etc. — no new colors.
- Existing files this plan must not break: `src/lib/ventas-context.tsx`, `src/components/layout/app-shell.tsx`, `src/components/ventas/*` — none of these are modified by this plan.

---

### Task 1: Mock usuarios + AuthProvider

**Files:**
- Create: `src/lib/mock-data/usuarios.ts`
- Create: `src/lib/auth-context.tsx`

**Interfaces:**
- Produces: `Rol` (`"vendedor" | "supervisor" | "administrador"`), `Usuario` type, `usuariosSeed: Usuario[]`; `AuthProvider`, `useAuth()` returning `{ usuarioActual: Usuario | null; cargando: boolean; login(email, password): boolean; logout(): void }`.
- Consumed by: Tasks 2, 3.

No UI is added in this task — it's pure data + a Context provider, not yet wired into the app. Verification is `npm run build` succeeding (nothing imports these files yet, so this only confirms the new files themselves compile).

- [ ] **Step 1: Write the mock users**

```ts
// src/lib/mock-data/usuarios.ts
export type Rol = "vendedor" | "supervisor" | "administrador";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
}

export const usuariosSeed: Usuario[] = [
  { id: "usr-1", nombre: "Ana Beltrán", email: "vendedor@gotham.sv", password: "vendedor123", rol: "vendedor" },
  { id: "usr-2", nombre: "Carlos Reyes", email: "supervisor@gotham.sv", password: "supervisor123", rol: "supervisor" },
  { id: "usr-3", nombre: "Lucía Hernández", email: "admin@gotham.sv", password: "admin123", rol: "administrador" },
];
```

- [ ] **Step 2: Write the auth context**

```tsx
// src/lib/auth-context.tsx
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
  cargando: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
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
  }, []);

  const login = useCallback((email: string, password: string) => {
    const usuario = usuariosSeed.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );
    if (!usuario) return false;
    window.localStorage.setItem(SESSION_KEY, usuario.id);
    setUsuarioActual(usuario);
    return true;
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    setUsuarioActual(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuarioActual, cargando, login, logout }}>
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

Note the `cargando` flag: on mount, `usuarioActual` starts `null` before the `useEffect` reads `localStorage`. Without `cargando`, a consumer checking "no user → redirect to /login" would fire on every page load for a split second even when a valid session exists. Callers must wait for `cargando === false` before treating `usuarioActual === null` as "not logged in."

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds (these two files aren't imported anywhere yet, so this only proves they typecheck).

- [ ] **Step 4: Commit**

```bash
git add src/lib/mock-data/usuarios.ts src/lib/auth-context.tsx
git commit -m "feat: add mock usuarios and AuthProvider"
```

---

### Task 2: Route restructure (auth guard) + login page

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/(app)/layout.tsx`
- Move: `src/app/page.tsx` → `src/app/(app)/page.tsx`
- Move: `src/app/ventas/page.tsx` → `src/app/(app)/ventas/page.tsx`
- Move: `src/app/ventas/nueva/page.tsx` → `src/app/(app)/ventas/nueva/page.tsx`
- Move: `src/app/ventas/[id]/page.tsx` → `src/app/(app)/ventas/[id]/page.tsx`
- Create: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `AuthProvider`, `useAuth()` from `@/lib/auth-context` (Task 1); `usuariosSeed` from `@/lib/mock-data/usuarios` (Task 1); existing `AppShell` from `@/components/layout/app-shell` (unmodified); existing `VentasProvider` from `@/lib/ventas-context` (unmodified).
- Produces: `/login` route; every existing route (`/`, `/ventas`, `/ventas/nueva`, `/ventas/[id]`) now sits behind an auth guard with no URL change (route groups `(app)` don't appear in the URL).

A Next.js route group (parentheses in the folder name) lets you wrap a set of routes in their own layout without adding a URL segment — `src/app/(app)/ventas/page.tsx` is still served at `/ventas`, not `/(app)/ventas`.

- [ ] **Step 1: Move the existing pages into the `(app)` route group**

```bash
mkdir -p "src/app/(app)/ventas/nueva" "src/app/(app)/ventas/[id]"
git mv src/app/page.tsx "src/app/(app)/page.tsx"
git mv src/app/ventas/page.tsx "src/app/(app)/ventas/page.tsx"
git mv src/app/ventas/nueva/page.tsx "src/app/(app)/ventas/nueva/page.tsx"
git mv "src/app/ventas/[id]/page.tsx" "src/app/(app)/ventas/[id]/page.tsx"
```

None of these files' contents change — only their location. After this, `src/app/ventas/` should be empty (safe to leave; Next.js ignores empty directories) and `src/app/page.tsx` no longer exists at the root.

- [ ] **Step 2: Update the root layout — drop `AppShell`, add `AuthProvider`**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { VentasProvider } from "@/lib/ventas-context";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600"],
});

export const metadata: Metadata = {
  title: "Facturación Electrónica — GOTHAM",
  description: "Prototipo de sistema de ventas y facturación electrónica (DTE)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AuthProvider>
          <VentasProvider>{children}</VentasProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
```

`AppShell` (the sidebar layout) moves to the `(app)` group's own layout below — `/login` must render without a sidebar, so it can't live in the root layout anymore.

- [ ] **Step 3: Write the `(app)` group layout with the auth guard**

```tsx
// src/app/(app)/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/layout/app-shell";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const { usuarioActual, cargando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !usuarioActual) {
      router.replace("/login");
    }
  }, [cargando, usuarioActual, router]);

  if (cargando || !usuarioActual) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
```

- [ ] **Step 4: Write the login page**

```tsx
// src/app/login/page.tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { usuariosSeed } from "@/lib/mock-data/usuarios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const { usuarioActual, cargando, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cargando && usuarioActual) {
      router.replace("/");
    }
  }, [cargando, usuarioActual, router]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const ok = login(email, password);
    if (!ok) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.replace("/");
  };

  const entrarComo = (usuarioEmail: string, usuarioPassword: string) => {
    setError(null);
    if (login(usuarioEmail, usuarioPassword)) {
      router.replace("/");
    }
  };

  if (cargando || usuarioActual) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-lg border bg-white p-8 shadow-sm">
        <div className="mb-6 text-center text-lg font-semibold tracking-tight text-ink-900">
          GOTHAM<span className="text-brand-600">·</span>Facturación
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              className="h-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-error-700">{error}</p>}
          <Button type="submit" className="h-10">
            Entrar
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          Acceso rápido de prueba
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="flex flex-col gap-2">
          {usuariosSeed.map((usuario) => (
            <Button
              key={usuario.id}
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => entrarComo(usuario.email, usuario.password)}
            >
              Entrar como {usuario.nombre.split(" ")[0]} ({usuario.rol})
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: build succeeds. Routes listed should include `/login`, `/`, `/ventas`, `/ventas/nueva`, `/ventas/[id]` (same as before — the `(app)` group segment is invisible in the route list).

- [ ] **Step 6: Manual verification with Playwright**

Start the dev server (`npm run dev`, wait for `http://localhost:3000` to respond) and run a script equivalent to:

```js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // 1. Visiting the app without a session redirects to /login
  await page.goto('http://localhost:3000/ventas', { waitUntil: 'networkidle' });
  console.log('URL after visiting /ventas unauthenticated:', page.url()); // expect .../login

  // 2. Quick-login as vendedor works and lands on dashboard
  await page.click('button:has-text("Entrar como Ana")');
  await page.waitForURL('http://localhost:3000/');
  console.log('URL after quick login:', page.url());

  // 3. Reloading keeps the session (localStorage)
  await page.reload({ waitUntil: 'networkidle' });
  console.log('URL after reload:', page.url()); // still / (not bounced to /login)

  // 4. Visiting /login while authenticated redirects back to /
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  console.log('URL after visiting /login while logged in:', page.url()); // expect .../

  await browser.close();
})();
```

Expected console output: step 1 ends in `/login`, step 2 and 3 end at `/`, step 4 ends back at `/`. Confirm no console errors (`page.on('console', ...)` with `msg.type() === 'error'`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add auth guard route group and login page"
```

---

### Task 3: Role-filtered sidebar + logout

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

**Interfaces:**
- Consumes: `useAuth()` from `@/lib/auth-context` (Task 1), `Rol` type from `@/lib/mock-data/usuarios` (Task 1).

- [ ] **Step 1: Read the current file**

Read `src/components/layout/app-sidebar.tsx` to confirm it still matches the version below before editing (it was last touched when the sidebar was first built; nothing since has modified it).

- [ ] **Step 2: Replace it with the role-aware version**

```tsx
// src/components/layout/app-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import type { Rol } from "@/lib/mock-data/usuarios";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
  roles: Rol[];
}

const TODOS_LOS_ROLES: Rol[] = ["vendedor", "supervisor", "administrador"];

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, enabled: true, roles: TODOS_LOS_ROLES },
  { href: "/ventas", label: "Ventas", icon: Receipt, enabled: true, roles: TODOS_LOS_ROLES },
  { href: "/reportes", label: "Reportes", icon: BarChart3, enabled: false, roles: ["supervisor", "administrador"] },
  { href: "/catalogos", label: "Catálogos", icon: Settings, enabled: false, roles: ["administrador"] },
  { href: "/seguridad", label: "Seguridad", icon: ShieldCheck, enabled: false, roles: ["administrador"] },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { usuarioActual, logout } = useAuth();

  const itemsVisibles = usuarioActual
    ? NAV_ITEMS.filter((item) => item.roles.includes(usuarioActual.rol))
    : [];

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-ink-900 px-3 py-6 text-slate-200">
      <div className="mb-8 px-3 text-lg font-semibold tracking-tight text-white">
        GOTHAM<span className="text-brand-600">·</span>Facturación
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {itemsVisibles.map(({ href, label, icon: Icon, enabled }) => {
          const active = enabled && (pathname === href || (href !== "/" && pathname.startsWith(href)));
          return (
            <Link
              key={href}
              href={enabled ? href : "#"}
              aria-disabled={!enabled}
              onClick={(e) => {
                if (!enabled) e.preventDefault();
              }}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                enabled ? "hover:bg-white/5" : "cursor-not-allowed text-slate-500",
                active && "bg-brand-600/15 text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {!enabled && <span className="ml-auto text-[10px] uppercase tracking-wide">Pronto</span>}
            </Link>
          );
        })}
      </nav>

      {usuarioActual && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="px-3">
            <p className="truncate text-sm font-medium text-white">{usuarioActual.nombre}</p>
            <p className="text-xs capitalize text-slate-400">{usuarioActual.rol}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual verification with Playwright**

With the dev server running, extend the script from Task 2 (or run fresh, clearing `localStorage` first via `page.evaluate(() => localStorage.clear())` then reloading) to check each role:

```js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.click('button:has-text("Entrar como Ana")'); // vendedor
  await page.waitForURL('http://localhost:3000/');
  await page.screenshot({ path: '/tmp/sidebar-vendedor.png' });
  // Expect: Dashboard, Ventas only — no Reportes/Catálogos/Seguridad, footer shows "Ana Beltrán" / "vendedor"

  await page.click('button:has-text("Cerrar sesión")');
  await page.waitForURL('http://localhost:3000/login');

  await page.click('button:has-text("Entrar como Carlos")'); // supervisor
  await page.waitForURL('http://localhost:3000/');
  await page.screenshot({ path: '/tmp/sidebar-supervisor.png' });
  // Expect: Dashboard, Ventas, Reportes (Pronto) — no Catálogos/Seguridad

  await page.click('button:has-text("Cerrar sesión")');
  await page.waitForURL('http://localhost:3000/login');

  await page.click('button:has-text("Entrar como Lucía")'); // administrador
  await page.waitForURL('http://localhost:3000/');
  await page.screenshot({ path: '/tmp/sidebar-administrador.png' });
  // Expect: all 5 items, Catálogos/Seguridad/Reportes all "Pronto"

  await browser.close();
})();
```

Look at the three screenshots directly and confirm the nav items match the table in the spec (`docs/superpowers/specs/2026-07-04-auth-roles-design.md`) for each role, and that "Cerrar sesión" actually returns to `/login` (confirmed by `waitForURL` not timing out).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat: filter sidebar nav by role and add logout"
```

---

## Manual verification (after Task 3)

1. `npm run dev`, visit `http://localhost:3000` fresh (clear `localStorage` first) — confirm redirect to `/login`.
2. Log in with the actual email/password form (not a quick-login button) for one user — confirm it works and wrong credentials show the inline error.
3. Confirm the existing POS flow (buscar cliente → carrito → confirmar → recibo → anulación) still works unchanged after the route move — this is a regression check, not new functionality.
4. Confirm `/ventas/nueva` and `/ventas/[id]` (an existing venta's id) both render correctly under the new `(app)` route group.
