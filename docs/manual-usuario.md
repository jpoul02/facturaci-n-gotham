# Manual de usuario — Adventure Works · Facturación

Sistema interno de ventas y facturación electrónica (DTE) de Adventure Works.

## 1. Acceso al sistema

Entrá a `/login` con tu correo corporativo y contraseña. Al enviar el formulario, el sistema valida el formato del correo y que la contraseña no esté vacía; si algún campo falla, el error aparece debajo del campo correspondiente. Si el correo y la contraseña no coinciden con ningún usuario activo, aparece "Correo o contraseña incorrectos." debajo del formulario.

### Usuarios de prueba

| Rol | Correo | Contraseña | Nombre |
|---|---|---|---|
| Vendedor | `vendedor@adventureworks.com` | `vendedor123` | Ana Beltrán |
| Supervisor | `supervisor@adventureworks.com` | `supervisor123` | Carlos Reyes |
| Administrador | `admin@adventureworks.com` | `admin123` | Lucía Hernández |

Al iniciar sesión con éxito, el sistema guarda el identificador del usuario en el `localStorage` del navegador bajo la clave `gotham_sesion`. Mientras esa clave exista, volver a abrir la aplicación (o recargar la página) te mantiene logueado — no hace falta volver a escribir la contraseña. Al hacer clic en "Cerrar sesión" esa clave se borra y volvés a `/login`.

Un usuario desactivado (ver sección 8, Seguridad) no puede iniciar sesión aunque escriba la contraseña correcta — el sistema lo trata igual que una combinación de correo/contraseña inválida, sin distinguir el motivo.

## 2. Roles y qué ve cada uno

El menú lateral se arma dinámicamente según el rol del usuario logueado — solo aparecen los ítems permitidos para ese rol. Si un usuario escribe manualmente en la barra de direcciones la URL de una sección que no le corresponde, el sistema lo detecta al cargar esa página y lo redirige automáticamente a `/` (Dashboard).

| Sección | Ruta | Vendedor | Supervisor | Administrador |
|---|---|:---:|:---:|:---:|
| Dashboard | `/` | ✅ | ✅ | ✅ |
| Ventas | `/ventas` | ✅ | ✅ | ✅ |
| Aprobaciones | `/aprobaciones` | — | ✅ | ✅ |
| Reportes | `/reportes` | — | ✅ | ✅ |
| Catálogos | `/catalogos` | — | — | ✅ |
| Seguridad | `/seguridad` | — | — | ✅ |
| Auditoría | `/auditoria` | — | — | ✅ |

## 3. Dashboard

El Dashboard muestra 4 bloques, todos recalculados en cada cambio del estado de ventas (no hace falta recargar la página para verlos actualizarse):

### 3.1 Tarjeta de resumen (arriba, fondo verde)

Cuenta cuántas ventas fueron **creadas en la fecha del día actual** (comparando la fecha de creación de cada venta contra la fecha de hoy, sin importar en qué estado se encuentre esa venta ahora mismo). Mientras ese conteo sea cero, el mensaje dice "Todavía no hay ventas registradas hoy." En cuanto se crea la primera venta del día (al hacer clic en "Confirmar venta" en el flujo de Nueva venta), el mensaje cambia de inmediato a "N ventas por $X hoy, con P pendientes de autorizar" — esto ocurre en el mismo instante en que la venta se confirma, sin esperar a que termine de emitirse el comprobante.

### 3.2 Las 3 tarjetas de métricas

- **Ventas hoy**: mismo conteo que el de la tarjeta de resumen (ventas creadas hoy, cualquier estado).
- **Monto total hoy**: suma del campo `total` de todas las ventas creadas hoy, sin importar su estado — incluye ventas que luego terminen en "Error DTE" o que hayan sido anuladas el mismo día.
- **Pendientes / Autorizadas**: a diferencia de las dos anteriores, **este contador no se limita a las ventas de hoy** — cuenta, sobre el total histórico de la sesión, cuántas ventas están en estado "Confirmada" o "Procesando" (pendientes) y cuántas están en estado "Autorizada" (sin importar en qué día se crearon).

### 3.3 Gráfico "Facturado — últimos 7 días"

Línea que suma el monto de las ventas **en estado Autorizada** agrupadas por día, para los últimos 7 días (incluyendo hoy). Una venta recién confirmada no aparece en este gráfico hasta que su emisión de comprobante se resuelve con éxito (ver sección 4.3 para el tiempo exacto). Mientras no haya ninguna venta en el sistema, muestra "Sin datos todavía." en vez del gráfico.

### 3.4 Gráfico "Ventas por estado"

Barras con la cantidad de ventas en cada uno de los 7 estados posibles (ver tabla de la sección 4.2), contando **todas** las ventas de la sesión sin filtrar por fecha. Se recalcula automáticamente cada vez que una venta cambia de estado (por ejemplo, al pasar de "Procesando" a "Autorizada").

## 4. Ventas — el flujo de venta (POS)

### 4.1 Nueva venta — los 4 pasos

Desde "Ventas" → "Nueva venta", o el botón "+ Nueva venta" del Dashboard. El indicador de pasos arriba de la pantalla avanza automáticamente según lo que ya completaste — no hay un botón "Siguiente", cada sección se habilita sola:

1. **Cliente** (paso 1 mientras no haya cliente elegido) — buscá un cliente existente por nombre o NIT en el combobox. Si no aparece, hacé clic en "Registrar cliente nuevo" dentro del mismo buscador y completá el formulario (nombre, tipo de documento, NIT; correo y teléfono son opcionales). Al guardar, ese cliente queda seleccionado automáticamente.
2. **Productos** (paso 2 mientras el carrito esté vacío) — buscá productos por nombre o código. Un producto marcado como inactivo aparece en la lista con la etiqueta "(no disponible)" y no se puede agregar — al intentarlo, aparece el mensaje `"{nombre}" no está disponible actualmente.` en vez de agregarse. Cada línea del carrito permite editar cantidad y porcentaje de descuento; el subtotal de la línea se recalcula al instante.
3. **Método de pago** (paso 3 mientras no se haya elegido uno) — Efectivo, Tarjeta o Transferencia. Es una selección única y obligatoria.
4. **Confirmar** (paso 4, cuando los tres anteriores están completos) — el botón "Confirmar venta" se habilita recién en este punto.

El recibo de la derecha (columna angosta) se recalcula en tiempo real a medida que cambiás cliente, productos o método de pago — ya muestra subtotal, impuesto y total antes de confirmar la venta.

### 4.2 Estados de una venta

| Estado | Se alcanza cuando... |
|---|---|
| Confirmada | Se hace clic en "Confirmar venta". Dura como máximo 400 milisegundos antes de pasar a "Procesando" automáticamente. |
| Procesando | 400 ms después de confirmarse. Dura 1200 ms más antes de resolverse. |
| Autorizada | Se resuelve el procesamiento con éxito. Se genera un registro de factura con código de generación, número de control y sello de recepción (ver 4.3). |
| Error DTE | Se resuelve el procesamiento sin éxito. No se genera factura. Desde el detalle de la venta hay un botón "Reintentar emisión" que vuelve a correr el mismo proceso desde "Procesando". |
| Anulación solicitada | Un vendedor pide anular una venta que estaba en "Autorizada", indicando un motivo. |
| Anulada | Un supervisor o administrador aprueba esa solicitud, desde "Aprobaciones". |

Si en cambio la rechaza, la venta vuelve directo a "Autorizada" y el motivo se descarta.

### 4.3 Tiempos exactos del procesamiento

Al confirmar una venta: pasan **400 ms** en estado "Confirmada", después pasa a "Procesando" y pasan **1200 ms** más antes de resolverse — en total, **1.6 segundos** desde que hacés clic en "Confirmar venta" hasta ver el resultado final (Autorizada o Error DTE), si no navegás a otra pantalla. La resolución tiene una probabilidad de éxito del 95% (y 5% de terminar en "Error DTE") en cada intento — incluyendo cada vez que se usa "Reintentar emisión". No hay límite de reintentos.

### 4.4 Detalle de una venta

La pantalla de detalle (`/ventas/{id}`) muestra siempre el método de pago elegido. Además:

- Si el estado es "Error DTE": aparece un aviso "El Nodo Fiscal rechazó la emisión de este comprobante." con el botón "Reintentar emisión".
- Si el estado es "Anulación solicitada": aparece el aviso "Anulación solicitada, esperando aprobación del supervisor." junto con el motivo ingresado.
- Si el estado es "Autorizada": aparecen los datos de la factura (código de generación, número de control, sello de recepción, fecha de emisión) y dos botones — "Descargar / Imprimir" (abre el diálogo de impresión del navegador) y "Solicitar anulación" (abre un formulario para escribir el motivo).
- Si el estado es "Anulada": se muestra el motivo de anulación debajo del recibo.

### 4.5 Cálculo de impuesto por línea

Cada línea del carrito "fotografía" el porcentaje de impuesto del producto en el momento exacto en que se agrega al carrito (según el tipo de impuesto asignado a ese producto en Catálogos). El total de impuesto de la venta es la suma del impuesto de cada línea por separado — no un porcentaje único aplicado al subtotal completo. Esto permite que una misma venta combine, por ejemplo, un producto gravado al 13% con uno exento al 0%, y el cálculo sea correcto para ambos. Si después se cambia el porcentaje de un tipo de impuesto en Catálogos, las ventas ya creadas no se recalculan — mantienen el porcentaje que tenían al momento de agregarse al carrito.

## 5. Aprobaciones (Supervisor / Administrador)

Lista únicamente las ventas en estado "Anulación solicitada": cliente, monto total, motivo. Botones "Aprobar" (pasa la venta a "Anulada") y "Rechazar" (la devuelve a "Autorizada" y borra el motivo). Si no hay ninguna solicitud pendiente, la tabla muestra "No hay solicitudes pendientes." en una sola fila.

## 6. Reportes (Supervisor / Administrador)

Todos los valores de esta pantalla se recalculan en cada render a partir del estado actual de `ventas` — no hay botón de "actualizar".

- **Total de ventas**: cuenta todas las ventas de la sesión, sin importar su estado.
- **Total facturado**: suma el `total` únicamente de las ventas en estado "Autorizada".
- **Ventas anuladas**: cuenta las ventas en estado "Anulada".
- **Anulaciones pendientes**: cuenta las ventas en estado "Anulación solicitada".
- **Ventas por estado**: los 7 estados con su conteo total (igual criterio que el gráfico de barras del Dashboard, pero como lista con las mismas insignias de estado que se ven en el resto de la app).
- **Top clientes** y **Top productos**: ambos se calculan **solo** sobre ventas en estado "Autorizada" — suman el monto facturado por cliente y la cantidad vendida por producto respectivamente, y muestran los 5 primeros de cada uno ordenados de mayor a menor. Si todavía no hay ninguna venta autorizada, cada lista muestra "Sin datos todavía."

## 7. Catálogos (Administrador)

Dos pestañas, cada una con su propia tabla y su propio formulario de alta/edición:

- **Productos** — código, nombre, precio, tipo (texto libre) y el tipo de impuesto que le aplica (buscador con autocompletado sobre la lista de tipos de impuesto existentes). Un producto inactivo no se puede agregar a un carrito nuevo (ver 4.1), pero sigue apareciendo en la búsqueda marcado como no disponible, y las líneas de venta ya creadas con ese producto no se ven afectadas.
- **Tipos de impuesto** — nombre y porcentaje (0 a 100). Los que ya vienen cargados son Gravado (13%), Exento (0%) y No sujeto (0%). Se pueden agregar tantos como se necesiten.

Ninguna de las dos tablas tiene una acción de borrado — la única forma de retirar un producto o un tipo de impuesto de circulación es desactivarlo con el botón correspondiente (ícono de encendido/apagado). Desactivar un tipo de impuesto no le impide seguir asignado a productos existentes ni afecta ventas pasadas.

## 8. Seguridad (Administrador)

Tabla de usuarios: nombre, correo, rol, si está activo. El botón "Editar" permite cambiar nombre, correo, rol, y opcionalmente la contraseña — si el campo de contraseña se deja en blanco al guardar, la contraseña actual del usuario no se modifica. El botón de activar/desactivar cambia el estado de acceso del usuario; un usuario desactivado deja de poder iniciar sesión inmediatamente en su próximo intento (una sesión ya abierta en otro navegador no se cierra automáticamente). Un administrador no puede desactivarse a sí mismo — el botón aparece deshabilitado en su propia fila.

## 9. Auditoría (Administrador)

Tabla de eventos, ordenada del más reciente al más antiguo (el evento más nuevo siempre aparece arriba). Cada fila muestra fecha y hora exactas, el usuario que hizo la acción (o "Sistema" si no hay un usuario identificable), el tipo de acción, y una descripción en texto. Las acciones que quedan registradas son: inicio y cierre de sesión; alta, edición, activación y desactivación de clientes, productos, tipos de impuesto y usuarios (el alta de clientes solo registra creación, no edición ni desactivación, porque el catálogo de clientes no tiene esas operaciones); y todo el ciclo de vida de una venta — creación, solicitud de anulación, aprobación o rechazo de anulación, y cada reintento de emisión. La resolución automática del procesamiento (que una venta pase de "Procesando" a "Autorizada" o "Error DTE") no genera un evento propio — solo la acción que la dispara (confirmar la venta o pedir un reintento) queda registrada.
