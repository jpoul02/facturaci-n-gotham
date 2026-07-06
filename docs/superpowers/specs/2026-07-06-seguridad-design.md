# Diseño: Seguridad — Gestión de Accesos (v1)

## Contexto

Séptimo sub-proyecto de GOTHAM, en `master` tras el merge de Pagos. Activa RF-A01 (Gestión de Accesos e Identidades), el único ítem de sidebar que sigue "Pronto" desde el sub-proyecto de Auth+Roles. Hoy `usuariosSeed` es un array estático de 3 usuarios (`src/lib/mock-data/usuarios.ts`) importado directo por `auth-context.tsx` y `login/page.tsx` — sin estado, sin CRUD.

Sigue sin backend real, sin tests automatizados (mismo criterio desde Auth+Roles en adelante). No hay hash de password — mismo nivel de "mock" que el resto del prototipo.

## Modelo de datos

`src/lib/mock-data/usuarios.ts` — nuevo campo:

```ts
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  activo: boolean;
}
```

`usuariosSeed` gana `activo: true` en sus 3 entradas existentes.

## Estado mutable en `AuthProvider`

`src/lib/auth-context.tsx` pasa a dueño del estado de usuarios (mismo patrón que `productos` dentro de `ventas-context.tsx`):

- `const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosSeed);`
- `login(email, password)` busca en `usuarios` (no en el import estático), y exige `usuario.activo === true` — si el usuario existe pero está inactivo, `login` devuelve `false` igual que credenciales incorrectas (sin mensaje distinto, evita enumeración de cuentas).
- Nuevas funciones expuestas por `useAuth()`:
  - `crearUsuario(data: Omit<Usuario, "id" | "activo">): Usuario` — siempre crea con `activo: true`.
  - `actualizarUsuario(id: string, data: Partial<Omit<Usuario, "id">>): void` — si `data.password` es `""` o `undefined`, no se sobreescribe el password existente.
  - `toggleActivoUsuario(id: string): void` — sin guarda de auto-desactivación a este nivel (la guarda vive en la UI, igual convención ya aceptada en este código para mutadores de contexto — ver hallazgo de Catálogos/Anulación: "mutadores de contexto invocables desde devtools sin importar el rol, aceptable por ser un prototipo sin backend").

`login/page.tsx` NO cambia — sus botones de "Acceso rápido de prueba" siguen importando `usuariosSeed` (el array estático original, no el contexto), por lo que siempre muestran los 3 usuarios originales sin importar cuántos agregue el admin después.

## Pantalla `/seguridad`

- Visible solo para Administrador (nav item pasa de `enabled: false` a `enabled: true`). Guard de página igual que `/catalogos` — `usuarioActual.rol !== "administrador"` redirige a `/`.
- Tabla (reusa `Table`/`TableHeader`/`TableRow`/`TableCell`, mismo patrón que `/catalogos`): columnas Nombre, Email, Rol, Activo (Sí/No), Acciones (Editar / Activar-Desactivar).
- El botón "Desactivar" de la fila del propio admin logueado (`usuario.id === usuarioActual.id`) está deshabilitado, con `title="No podés desactivar tu propia cuenta"` en vez de ocultarse (más descubrible).
- Botón "+ Nuevo usuario" abre el mismo dialog en modo creación.

## `UsuarioDialog` (crear/editar)

Mirror de `producto-dialog.tsx`:

- Campos: Nombre (Input), Email (Input, `type="email"`), Rol (3 botones toggle exclusivos — mismo patrón visual que `MetodoPagoSelector`, ya que Rol es un enum fijo de 3 valores, no una búsqueda de entidad), Password (Input `type="password"`).
- Al crear: Password requerido (no vacío). Al editar: Password opcional — placeholder "Dejar en blanco para no cambiar", campo vacío al abrir el dialog en modo edición (nunca se precarga el password existente).
- Validación para habilitar "Guardar": nombre y email no vacíos, rol seleccionado, y (si es creación) password no vacío.
- No se valida email duplicado (fuera de scope, ver abajo).

## Fuera de scope (v1)

Validación de email duplicado entre usuarios, hash real de password, recuperación de contraseña, permisos granulares más allá del rol (ej. permisos por acción), invalidar sesiones activas de un usuario recién desactivado (si ya tiene sesión en `localStorage`, sigue activa hasta que cierre sesión manualmente — no hay mecanismo de "kill session" sin backend real), historial de cambios sobre usuarios (eso es Auditoría, sub-proyecto aparte).

## Manejo de errores

- Login con usuario inactivo: mismo mensaje genérico "Correo o contraseña incorrectos." (ya existente en `login/page.tsx`, sin cambios).
- Auto-desactivación: botón deshabilitado, no hay ruta para disparar el error en UI normal (mutador de contexto sin guarda queda como aceptado, igual que otros sub-proyectos).
- Password vacío al crear / nombre-email vacíos: botón "Guardar" deshabilitado, mismo patrón que `ProductoDialog`.

## Verificación (sin tests automatizados)

Manual con Playwright: login como Lucía (admin) → `/seguridad` → confirmar tabla con 3 usuarios seed, todos activos. Crear un usuario nuevo (ej. rol vendedor), confirmar aparece en tabla. Cerrar sesión, loguearse con las credenciales del usuario recién creado, confirmar acceso correcto según su rol. Como Lucía, editar ese usuario (cambiar rol a supervisor, dejar password en blanco), confirmar el cambio se refleja y el login viejo sigue funcionando con la password original. Desactivar ese usuario, confirmar que ya no puede loguearse (mensaje genérico). Confirmar que el botón "Desactivar" en la fila de Lucía (su propia cuenta) está deshabilitado. Login como Ana (vendedor) o Carlos (supervisor), confirmar que "Seguridad" no aparece en el sidebar y que navegar directo a `/seguridad` redirige a `/`. `npm run build` sin errores, `npm test` sigue en 8 archivos/31 tests (este sub-proyecto no cambia lógica cubierta por tests existentes, pero si `login` cambia de firma o comportamiento de forma observable por algún test existente, corregirlo es parte de la tarea, no un test nuevo).
