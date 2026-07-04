import { describe, it, expect } from "vitest";
import { generarFactura, generarNumeroControl } from "./factura-generator";

describe("generarNumeroControl", () => {
  it("rellena la secuencia a 15 dígitos", () => {
    expect(generarNumeroControl(1)).toBe("DTE-01-A001P001-000000000000001");
  });
});

describe("generarFactura", () => {
  it("genera correlativo, código de generación y número de control consistentes", () => {
    const factura = generarFactura("venta-123", 7);
    expect(factura.ventaId).toBe("venta-123");
    expect(factura.correlativo).toBe("V-000007");
    expect(factura.numeroControl).toBe("DTE-01-A001P001-000000000000007");
    expect(factura.codigoGeneracion).toMatch(/^[0-9A-F-]{36}$/);
    expect(factura.selloRecepcion).toMatch(/^MH-/);
    expect(new Date(factura.fechaEmision).toString()).not.toBe("Invalid Date");
  });
});
