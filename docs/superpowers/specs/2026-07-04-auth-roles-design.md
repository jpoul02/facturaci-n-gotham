# Diseño: Autenticación + Roles (v1)

## Contexto

Segundo sub-proyecto del sistema "GOTHAM" (el primero fue el flujo POS, ya implementado en `docs/superpowers/specs/2026-07-04-pos-flujo-venta-design.md`). El prototipo completo tiene 3 roles (Vendedor, Supervisor, Administrador) y varios módulos que hoy son placeholders deshabilitados en el sidebar. Antes de construir esos módulos (aprobación de anulaciones por supervisor, catálogos de administrador, reportes) se necesita saber quién está usando la app — este documento cubre solo eso: login y sesión por rol, sin construir todavía las pantallas de los módulos futuros.

Sigue siendo un prototipo frontend puro — sin backend real, datos mock, "autenticación" es una validación contra una lista fija de usuarios.

**Nota de proceso:** por pedido del usuario, este sub-proyecto se implementa sin tests automatizados (Vitest/Testing Library). Verificación es manual: build exitoso + capturas de Playwright recorriendo el flujo real.

## Usuarios mock

`src/lib/mock-data/usuarios.ts` — 3 usuarios fijos:

| Nombre | Email | Password | Rol |
|---|---|---|---|
| Ana Beltrán | vendedor@gotham.sv | vendedor123 | vendedor |
| Carlos Reyes | supervisor@gotham.sv | supervisor123 | supervisor |
| Lucía Hernández | admin@gotham.sv | admin123 | administrador |

```ts
type Rol = "vendedor" | "supervisor" | "administrador";
interface Usuario { id: string; nombre: string; email: string; password: string; rol: Rol; }
```

## Sesión

`src/lib/auth-context.tsx` — `AuthProvider` (Context) + `useAuth()`, respaldado en `localStorage` (clave `gotham_sesion`, guarda el `id` del usuario). Al montar, lee `localStorage` y restaura la sesión si el id todavía corresponde a un usuario válido.

```ts
interface AuthContextValue {
  usuarioActual: Usuario | null;
  login: (email: string, password: string) => boolean; // true si éxito
  logout: () => void;
}
```

`login` busca en la lista mock por email+password exactos; si coincide, guarda el id en `localStorage` y actualiza el estado; si no, devuelve `false` (la pantalla de login muestra el error). `logout` limpia `localStorage` y el estado.

## Rutas — reestructuración con route group

```
src/app/
  layout.tsx              — raíz: fuentes, AuthProvider, VentasProvider, Toaster (SIN AppShell)
  login/page.tsx           — standalone, sin sidebar
  (app)/
    layout.tsx              — AppShell + guard de sesión (mueve la lógica que hoy vive en layout.tsx)
    page.tsx                — dashboard (movido de src/app/page.tsx)
    ventas/page.tsx          — movido tal cual
    ventas/nueva/page.tsx    — movido tal cual
    ventas/[id]/page.tsx     — movido tal cual
```

`(app)/layout.tsx` es un client component: si `useAuth().usuarioActual` es `null`, redirige a `/login` (`useEffect` + `router.replace`) y no renderiza `AppShell` mientras redirige (evita parpadeo de contenido protegido). Si hay sesión, renderiza `AppShell` normalmente.

Mover archivos es un rename/relocate — el contenido de cada page no cambia, solo la carpeta contenedora (route groups `(app)` no aparecen en la URL).

## Pantalla de login

`src/app/login/page.tsx` — formulario centrado (email + password, `h-10`, botón "Entrar"), sin sidebar. Debajo, separador y 3 botones "Entrar como Vendedor / Supervisor / Administrador" — un click, sin escribir nada (llaman `login()` con las credenciales fijas del usuario correspondiente). Si ya hay sesión activa y el usuario visita `/login` directamente, redirige a `/`.

Credenciales inválidas → mensaje de error inline bajo el form (no toast), sin revelar si el email existe o la contraseña es incorrecta.

## Sidebar reactivo al rol

`AppSidebar` ya no es una lista estática — filtra `NAV_ITEMS` según `usuarioActual.rol`:

| Item | Vendedor | Supervisor | Administrador |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Ventas | ✅ | ✅ | ✅ |
| Reportes | — | ✅ (Pronto) | ✅ (Pronto) |
| Catálogos | — | — | ✅ (Pronto) |
| Seguridad | — | — | ✅ (Pronto) |

Los ítems marcados "Pronto" siguen deshabilitados (esas pantallas son sub-proyectos futuros) — lo que cambia es cuáles aparecen en absoluto según el rol, no si ya funcionan.

Footer del sidebar (debajo del nav): nombre del usuario actual, badge del rol, botón "Cerrar sesión" (llama `logout()` y redirige a `/login`).

## Fuera de scope (v1 de este sub-proyecto)

Pantallas reales de Reportes/Catálogos/Seguridad, aprobación de anulaciones por supervisor, asociar `vendedorId` a las ventas creadas, cualquier validación de permisos a nivel de acción (solo a nivel de qué se muestra en el sidebar y qué rutas son accesibles). Password hashing / seguridad real (es mock plano, aceptable para prototipo).

## Manejo de errores

- Login con credenciales incorrectas → mensaje inline "Correo o contraseña incorrectos."
- Sesión con un `id` de usuario que ya no existe en la lista mock (edge case si se edita el array a mano) → tratada como sesión inválida, limpia `localStorage` y redirige a `/login`.
- Acceso directo a una ruta de `(app)` sin sesión → redirige a `/login` sin parpadeo de contenido.

## Verificación (sin tests automatizados)

Manual, con Playwright para capturas: login con cada uno de los 3 botones rápidos, confirmar que el sidebar muestra los items correctos por rol, confirmar que logout limpia sesión y redirige, confirmar que refrescar la página mantiene la sesión (localStorage), confirmar que acceder a `/ventas` sin sesión redirige a `/login`. Además `npm run build` debe compilar sin errores.
