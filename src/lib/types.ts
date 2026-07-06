export type EstadoVenta =
  | "borrador"
  | "confirmada"
  | "procesando_dte"
  | "autorizada"
  | "error_dte"
  | "anulacion_solicitada"
  | "anulada";

export type MetodoPago = "efectivo" | "tarjeta" | "transferencia";

export interface Cliente {
  id: string;
  nombre: string;
  tipoDocumento: "DUI" | "NIT" | "Pasaporte";
  nit: string;
  correo?: string;
  telefono?: string;
}

export interface TipoImpuesto {
  id: string;
  nombre: string;
  porcentaje: number;
  activo: boolean;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  precio: number;
  tipo: string;
  tipoImpuestoId: string;
  activo: boolean;
}

export interface LineaVenta {
  id: string;
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  descuentoPct: number;
  impuestoPct: number;
  subtotal: number;
}

export interface Venta {
  id: string;
  clienteId: string;
  lineas: LineaVenta[];
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  estado: EstadoVenta;
  metodoPago: MetodoPago;
  fecha: string;
  motivoAnulacion?: string;
}

export interface Factura {
  id: string;
  ventaId: string;
  correlativo: string;
  codigoGeneracion: string;
  numeroControl: string;
  selloRecepcion?: string;
  fechaEmision: string;
}
