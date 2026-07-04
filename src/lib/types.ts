export type EstadoVenta =
  | "borrador"
  | "confirmada"
  | "procesando_dte"
  | "autorizada"
  | "error_dte"
  | "anulacion_solicitada"
  | "anulada";

export interface Cliente {
  id: string;
  nombre: string;
  tipoDocumento: "DUI" | "NIT" | "Pasaporte";
  nit: string;
  correo?: string;
  telefono?: string;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  precio: number;
  tipo: string;
  activo: boolean;
}

export interface LineaVenta {
  id: string;
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  descuentoPct: number;
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
