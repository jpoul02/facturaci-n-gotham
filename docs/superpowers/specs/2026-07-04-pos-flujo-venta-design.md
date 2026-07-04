# Diseño: Flujo POS de Venta y Facturación Electrónica (v1)

## Contexto

Prototipo frontend (Next.js 16, sin backend real, datos mock) del sistema de ventas y facturación electrónica "GOTHAM" para El Salvador (DTE — Documento Tributario Electrónico). El sistema completo tiene 6 módulos (Clientes, Ventas/POS, Pagos, Facturación DTE, Reportes/Auditoría, Seguridad/Catálogos), derivados de diagramas ER, de secuencia, de actividad y casos de uso por rol (Vendedor, Supervisor, Administrador) provistos por el usuario.

Este documento cubre **solo el primer sub-proyecto: el flujo POS completo** — buscar/registrar cliente → armar carrito → confirmar venta → emitir factura (DTE simulado) → ver/imprimir comprobante → solicitar anulación. Los demás módulos (roles/permisos, reportes, catálogos, pagos reales) quedan fuera de este scope y se abordarán en specs separadas.

## Alcance de datos

Frontend puro. Sin base de datos ni API externas. Toda la data (clientes, productos, ventas, facturas) vive en `src/lib/mock-data/*.ts` como arrays en memoria + funciones que simulan operaciones async (con delay artificial) para que los componentes ya estén listos para un backend real después. El estado de "persistencia" dura solo la sesión del navegador (in-memory store), no hay localStorage ni DB.

## Rutas (App Router)

```
/                     Dashboard: KPIs del día (ventas, monto total, pendientes) + accesos rápidos
/ventas               Listado de ventas: tabla densa, filtros, status pills
/ventas/nueva         POS: split-view cliente+carrito (izq) / recibo en vivo (der)
/ventas/[id]          Detalle de venta/factura: recibo completo, acción "Solicitar anulación"
```

Layout raíz: sidebar fija oscura + área de contenido. Ítems de sidebar para módulos futuros (Reportes, Catálogos, Seguridad) se muestran deshabilitados/greyed como placeholder de la navegación completa, sin rutas funcionales aún.

## Modelo de datos (mock, TypeScript types)

Basado en el ER provisto, recortado a lo que usa el flujo POS:

```ts
type Cliente = { id: string; nombre: string; tipoDocumento: string; nit: string; correo?: string; telefono?: string }
type Producto = { id: string; codigo: string; nombre: string; precio: number; tipo: string; activo: boolean }
type LineaVenta = { id: string; productoId: string; cantidad: number; precioUnitario: number; descuento: number; subtotal: number }
type Venta = {
  id: string; clienteId: string; vendedorId: string;
  lineas: LineaVenta[]; subtotal: number; descuento: number; impuesto: number; total: number;
  estado: 'borrador' | 'confirmada' | 'procesando_dte' | 'autorizada' | 'error_dte' | 'anulacion_solicitada' | 'anulada';
  fecha: string;
}
type Factura = {
  id: string; ventaId: string; correlativo: string; codigoGeneracion: string /* UUID */;
  numeroControl: string; selloRecepcion?: string; fechaEmision: string; pdfUrl?: string;
}
```

`estado` de Venta maneja tanto el ciclo de venta como el de la factura (simplificación intencional para v1 — no separamos Venta/Factura como dos entidades con estados independientes en la UI, aunque el mock data sí genera un registro `Factura` aparte cuando `estado` llega a `autorizada`).

## Flujo POS (paso a paso)

1. **Buscar/registrar cliente** — combobox con búsqueda (Popover+Command, patrón ya establecido). Si no hay resultados, botón "Registrar cliente nuevo" abre un modal con form mínimo (nombre, tipo documento, NIT).
2. **Carrito** — buscar producto por nombre/código, agregar línea, editar cantidad/descuento inline. Recalcula subtotal/impuesto/total en vivo.
3. **Confirmar venta** — resumen final, botón "Confirmar venta". Al confirmar: `estado → 'confirmada'`, luego simula transición automática a `'procesando_dte'` (spinner ~1.2s) y después a `'autorizada'` o (5% de las veces, simulado) `'error_dte'` para poder mostrar y probar el estado de error.
4. **Comprobante** — si autorizada, se genera `Factura` mock (correlativo, código de generación UUID, número de control) y se muestra el recibo final con botón "Descargar/Imprimir" (mock, genera un PDF simple con `@react-pdf/renderer` o simplemente una vista imprimible con `window.print()` — decisión técnica en el plan de implementación).
5. **Anulación** — desde `/ventas/[id]`, si `estado === 'autorizada'`, botón "Solicitar anulación" abre dialog (motivo obligatorio). Al confirmar, `estado → 'anulada'` directo (sin paso de aprobación de supervisor en v1, según lo acordado).

Un stepper delgado (1 Cliente · 2 Carrito · 3 Confirmar) marca el progreso en `/ventas/nueva` — justificado porque es una secuencia real de wizard, no decoración.

## Sistema visual

**Paleta:**
- `--canvas: #F5F6F8` — fondo principal
- `--ink-900: #10172A` — sidebar / texto fuerte
- `--brand-600: #3454D1` — acciones primarias / nav activo
- `--success-700: #147A52` — Autorizada
- `--pending-700: #B9770E` — Pendiente / Procesando
- `--error-700: #B23A3A` — Rechazada / Anulada / Error DTE

**Tipografía:** Geist Sans (UI general) + Geist Mono (correlativo, código de generación, número de control, montos en tabla) + Fraunces solo para el monto total grande en el recibo preview.

**Layout:** sidebar oscura fija, cards con borde hairline 1px (no sombras pesadas), tabla de ventas densa con status pills. POS en split-view con recibo en vivo con borde superior perforado (CSS).

**Firma del diseño — el sello:** estados terminales con respaldo del Nodo Fiscal (Autorizada, Anulada, Rechazada/Error DTE) se muestran como sello — badge rotado -6°, borde punteado, tracking ancho — en vez de pill plana. Pendiente/Procesando/Confirmada quedan como pill normal (son estados provisionales, no oficiales). El sello tiene una animación de entrada única (scale 1.15→1, ease-out ~200ms) la primera vez que aparece por venta.

**Motion:** botones con `scale(0.97)` en `:active`; popovers/combobox origin-aware; toasts (sonner) para confirmaciones ("Venta confirmada", "Anulación solicitada"); nada de animación en acciones repetitivas de teclado.

## Manejo de errores

- Producto inactivo/no encontrado al agregar al carrito → bloquear línea, mensaje inline (no toast), según diagrama de secuencia original.
- Error DTE (simulado 5%) → estado `error_dte`, banner en el detalle de venta con botón "Reintentar emisión" (vuelve a simular el llamado al Nodo Fiscal).
- Cliente duplicado al registrar → validar por NIT contra mock data, mostrar el cliente existente en vez de crear uno nuevo.
- Carrito vacío → botón "Confirmar venta" deshabilitado.

## Fuera de scope (v1)

Roles/permisos reales (login, RBAC), aprobación de anulación por supervisor, reportes/auditoría, catálogos fiscales editables, pagos (múltiples métodos, validación real), integración real con Ministerio de Hacienda. Estos son sub-proyectos futuros, cada uno con su propia spec.

## Testing

- Componentes de cálculo (subtotal/impuesto/descuento/total) con tests unitarios puros (sin UI).
- Flujo completo POS con test de integración (Testing Library): buscar cliente → agregar producto → confirmar → ver estado autorizada.
- Casos de error: producto inválido, error DTE simulado, cliente duplicado.
