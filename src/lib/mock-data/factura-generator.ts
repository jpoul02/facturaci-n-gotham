import type { Factura } from "@/lib/types";

export function generarNumeroControl(secuencia: number): string {
  return `DTE-01-A001P001-${String(secuencia).padStart(15, "0")}`;
}

export function generarFactura(ventaId: string, secuencia: number): Factura {
  return {
    id: crypto.randomUUID(),
    ventaId,
    correlativo: `V-${String(secuencia).padStart(6, "0")}`,
    codigoGeneracion: crypto.randomUUID().toUpperCase(),
    numeroControl: generarNumeroControl(secuencia),
    selloRecepcion: `MH-${Date.now()}`,
    fechaEmision: new Date().toISOString(),
  };
}
