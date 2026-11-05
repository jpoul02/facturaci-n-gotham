import type { Cliente, Factura, Producto, TipoImpuesto, Venta } from "@/lib/types";

export const clientesSeed: Cliente[] = [
  {
    id: "cli-1",
    nombre: "Club Ciclista San Miguel",
    tipoDocumento: "NIT",
    nit: "0614-010190-101-2",
    correo: "contacto@clubciclistasm.com",
    telefono: "2222-3344",
  },
  {
    id: "cli-2",
    nombre: "Karla Beatriz Hernández",
    tipoDocumento: "DUI",
    nit: "04521789-3",
    correo: "karla.hdz@gmail.com",
  },
  {
    id: "cli-3",
    nombre: "Rodada Sport S.A. de C.V.",
    tipoDocumento: "NIT",
    nit: "0614-250887-102-5",
    telefono: "2245-9090",
  },
];

export const tiposImpuestoSeed: TipoImpuesto[] = [
  { id: "ti-1", nombre: "Gravado", porcentaje: 13, activo: true },
  { id: "ti-2", nombre: "Exento", porcentaje: 0, activo: true },
  { id: "ti-3", nombre: "No sujeto", porcentaje: 0, activo: true },
];

export const productosSeed: Producto[] = [
  { id: "prod-1", codigo: "P-001", nombre: 'Cámara de aire 29"', precio: 8.5, tipo: "Repuestos", tipoImpuestoId: "ti-1", activo: true },
  { id: "prod-2", codigo: "P-002", nombre: 'Bicicleta de montaña Trail 29"', precio: 649.0, tipo: "Bicicletas", tipoImpuestoId: "ti-1", activo: true },
  { id: "prod-3", codigo: "P-003", nombre: "Bicicleta de ruta Aero 105", precio: 1249.0, tipo: "Bicicletas", tipoImpuestoId: "ti-1", activo: true },
  { id: "prod-4", codigo: "P-004", nombre: "Casco de ciclismo MIPS", precio: 74.9, tipo: "Accesorios", tipoImpuestoId: "ti-1", activo: true },
  { id: "prod-5", codigo: "P-005", nombre: "Servicio de mantenimiento general", precio: 25.0, tipo: "Servicio", tipoImpuestoId: "ti-1", activo: true },
  { id: "prod-6", codigo: "P-006", nombre: "Parche para cámara (descontinuado)", precio: 3.25, tipo: "Repuestos", tipoImpuestoId: "ti-1", activo: false },
  { id: "prod-7", codigo: "P-007", nombre: "Guantes de ciclismo gel", precio: 18.5, tipo: "Indumentaria", tipoImpuestoId: "ti-1", activo: true },
  { id: "prod-8", codigo: "P-008", nombre: "Luz delantera LED recargable", precio: 22.0, tipo: "Accesorios", tipoImpuestoId: "ti-1", activo: true },
  { id: "prod-9", codigo: "P-009", nombre: "Candado en U de acero", precio: 34.9, tipo: "Accesorios", tipoImpuestoId: "ti-1", activo: true },
];

export const ventasSeed: Venta[] = [];
export const facturasSeed: Factura[] = [];
