# Usuarios de prueba (demo)

Credenciales semilla de `src/lib/mock-data/usuarios.ts`. Usalas en `/login` — ya no hay botones de acceso rápido en la UI, así que hay que loguearse con el formulario.

| Rol | Correo | Contraseña | Nombre |
|---|---|---|---|
| Vendedor | `vendedor@adventureworks.com` | `vendedor123` | Ana Beltrán |
| Supervisor | `supervisor@adventureworks.com` | `supervisor123` | Carlos Reyes |
| Administrador | `admin@adventureworks.com` | `admin123` | Lucía Hernández |

Sin backend real — estos usuarios viven en memoria (`AuthProvider`), se resetean al recargar salvo por la sesión guardada en `localStorage` (`gotham_sesion`).
