# Manual de usuario — Adventure Works · Facturación

Sistema interno de ventas y facturación electrónica (DTE) de Adventure Works. Prototipo funcional, sin conexión a un backend fiscal real — la emisión de comprobantes se simula.

## 1. Acceso al sistema

Entrá a `/login` con tu correo corporativo y contraseña.

### Usuarios de prueba

| Rol | Correo | Contraseña | Nombre |
|---|---|---|---|
| Vendedor | `vendedor@adventureworks.com` | `vendedor123` | Ana Beltrán |
| Supervisor | `supervisor@adventureworks.com` | `supervisor123` | Carlos Reyes |
| Administrador | `admin@adventureworks.com` | `admin123` | Lucía Hernández |

La sesión se guarda en el navegador (`localStorage`) — se mantiene aunque recargues la página, hasta que hagas clic en "Cerrar sesión". Un usuario desactivado (ver sección Seguridad) no puede iniciar sesión aunque la contraseña sea correcta.

## 2. Roles y qué ve cada uno

El menú lateral cambia según tu rol — solo aparecen las secciones que te corresponden.

| Sección | Vendedor | Supervisor | Administrador |
|---|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ |
| Ventas | ✅ | ✅ | ✅ |
| Aprobaciones | — | ✅ | ✅ |
| Reportes | — | ✅ | ✅ |
| Catálogos | — | — | ✅ |
| Seguridad | — | — | ✅ |
| Auditoría | — | — | ✅ |

Si entrás a una URL de una sección que no te corresponde, el sistema te redirige automáticamente al Dashboard.

## 3. Dashboard

Resumen general: ventas de hoy, monto facturado hoy, ventas pendientes de autorizar vs. autorizadas, un gráfico de facturado en los últimos 7 días, y un gráfico de ventas por estado. Accesos rápidos a "Nueva venta" y "Ver reportes".

## 4. Ventas — el flujo de venta (POS)

### 4.1 Nueva venta

Desde "Ventas" → "Nueva venta", o el botón "+ Nueva venta" del Dashboard. El proceso tiene 4 pasos (ver el indicador arriba de la pantalla):

1. **Cliente** — buscá un cliente existente por nombre o NIT en el buscador. Si no existe, hacé clic en "Registrar cliente nuevo" y completá el formulario (nombre, tipo de documento, NIT, correo/teléfono opcionales).
2. **Carrito** — buscá productos por nombre o código y agregalos. Podés ajustar cantidad y % de descuento por línea. Un producto desactivado no se puede agregar (aparece marcado "no disponible").
3. **Pago** — elegí el método: Efectivo, Tarjeta o Transferencia.
4. **Confirmar** — el recibo de la derecha muestra el detalle en tiempo real (subtotal, impuesto calculado por línea según el tipo de impuesto de cada producto, total). Al confirmar, la venta queda en estado "Confirmada" y arranca la emisión simulada del comprobante.

### 4.2 Estados de una venta

| Estado | Qué significa |
|---|---|
| Confirmada | La venta se guardó, esperando el resultado de la emisión. |
| Procesando | Se está simulando la emisión ante el Nodo Fiscal (~1.2 segundos). |
| Autorizada | El comprobante se emitió con éxito — se genera código de generación, número de control y sello de recepción. |
| Error DTE | La emisión simulada falló (~5% de probabilidad). Desde el detalle de la venta podés hacer clic en "Reintentar emisión". |
| Anulación solicitada | El vendedor pidió anular una venta autorizada, queda esperando aprobación de un supervisor/administrador. |
| Anulada | Un supervisor/administrador aprobó la anulación. |

### 4.3 Anular una venta

Desde el detalle de una venta autorizada, botón "Solicitar anulación" — pedís un motivo. Queda pendiente hasta que alguien con rol Supervisor o Administrador la apruebe o la rechace en "Aprobaciones". Si se rechaza, la venta vuelve a "Autorizada".

## 5. Aprobaciones (Supervisor / Administrador)

Lista las ventas con anulación solicitada: cliente, monto, motivo. Botones "Aprobar" (pasa a Anulada) o "Rechazar" (vuelve a Autorizada).

## 6. Reportes (Supervisor / Administrador)

Métricas de solo lectura: total de ventas, total facturado (suma de ventas autorizadas), ventas anuladas, anulaciones pendientes, desglose por estado, y los top 5 clientes/productos por monto/cantidad facturado (solo cuentan ventas autorizadas).

## 7. Catálogos (Administrador)

Dos pestañas:

- **Productos** — crear, editar, activar/desactivar productos (código, nombre, precio, tipo, y el tipo de impuesto que le aplica). Un producto desactivado no se puede agregar a un carrito nuevo, pero las ventas ya hechas con ese producto no cambian.
- **Tipos de impuesto** — crear, editar, activar/desactivar tipos de impuesto (nombre + porcentaje). Ejemplos ya cargados: Gravado (13%), Exento (0%), No sujeto (0%). El porcentaje se "fotografía" en cada línea de venta al momento de agregarla al carrito — si editás el porcentaje de un tipo de impuesto después, las ventas ya hechas no cambian.

Ninguno de los dos catálogos tiene borrado real — solo activar/desactivar.

## 8. Seguridad (Administrador)

Gestión de usuarios: crear, editar (nombre, correo, rol, y opcionalmente la contraseña — dejarla en blanco significa "no cambiar"), y activar/desactivar. Un administrador no puede desactivar su propia cuenta. Un usuario desactivado no puede iniciar sesión.

## 9. Auditoría (Administrador)

Registro de todas las acciones importantes hechas en el sistema (quién, cuándo, qué): inicios y cierres de sesión, creación de clientes/productos/tipos de impuesto/usuarios, activaciones/desactivaciones, y todo el ciclo de vida de las ventas (creación, anulación solicitada/aprobada/rechazada, reintentos de emisión). Se muestra en orden del evento más reciente al más antiguo. No se audita la resolución automática de la emisión DTE (solo la acción que la dispara).

## 10. Notas técnicas (para quien vaya a hacer una demo)

- No hay backend ni base de datos real — todo vive en memoria del navegador (React). Recargar la página reinicia ventas, clientes, productos, tipos de impuesto y usuarios creados en la sesión a sus valores semilla. La única excepción es la sesión de login, que persiste en `localStorage`.
- La emisión de DTE es 100% simulada (~95% de éxito, ~5% de error, con un retraso artificial de ~1.2 segundos) — no hay conexión a un Nodo Fiscal real de El Salvador.
- Las contraseñas de los usuarios de prueba están en texto plano en el código (`src/lib/mock-data/usuarios.ts`) — es un prototipo, no usar este patrón en producción.
