import type { Cliente, Factura, Producto, TipoImpuesto, Venta } from "@/lib/types";

export const clientesSeed: Cliente[] = [
  {
    id: "cli-1",
    nombre: "Distribuidora San Miguel S.A. de C.V.",
    tipoDocumento: "NIT",
    nit: "0614-010190-101-2",
    correo: "contacto@distsm.com",
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
    nombre: "Ferretería El Martillo",
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
  { id: "prod-1", codigo: "P-001", nombre: "Cemento Fortaleza 42.5kg", precio: 8.5, tipo: "Material construcción", tipoImpuestoId: "ti-1", activo: true },
  { id: "prod-2", codigo: "P-002", nombre: 'Varilla de hierro 3/8" x 6m', precio: 6.75, tipo: "Material construcción", tipoImpuestoId: "ti-1", activo: true },
  { id: "prod-3", codigo: "P-003", nombre: "Pintura látex blanco 1gal", precio: 14.9, tipo: "Pintura", tipoImpuestoId: "ti-1", activo: true },
  { id: "prod-4", codigo: "P-004", nombre: "Taladro inalámbrico 20V", precio: 45.0, tipo: "Herramienta", tipoImpuestoId: "ti-1", activo: true },
  { id: "prod-5", codigo: "P-005", nombre: "Servicio de instalación", precio: 25.0, tipo: "Servicio", tipoImpuestoId: "ti-1", activo: true },
  { id: "prod-6", codigo: "P-006", nombre: "Cinta métrica 5m (descontinuada)", precio: 3.25, tipo: "Herramienta", tipoImpuestoId: "ti-1", activo: false },
];

export const ventasSeed: Venta[] = [];
export const facturasSeed: Factura[] = [];
