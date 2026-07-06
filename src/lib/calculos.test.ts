import { describe, it, expect } from "vitest";
import { calcularSubtotalLinea, calcularTotalesVenta, IVA_PCT } from "./calculos";

describe("calcularSubtotalLinea", () => {
  it("aplica cantidad y descuento porcentual", () => {
    const subtotal = calcularSubtotalLinea({ cantidad: 2, precioUnitario: 10, descuentoPct: 10 });
    expect(subtotal).toBe(18);
  });

  it("sin descuento devuelve cantidad * precio", () => {
    const subtotal = calcularSubtotalLinea({ cantidad: 3, precioUnitario: 8.5, descuentoPct: 0 });
    expect(subtotal).toBe(25.5);
  });
});

describe("calcularTotalesVenta", () => {
  it("calcula subtotal, descuento, impuesto (13%) y total sobre varias líneas", () => {
    const totales = calcularTotalesVenta([
      { cantidad: 2, precioUnitario: 10, descuentoPct: 10, impuestoPct: 13 }, // subtotal 18
      { cantidad: 1, precioUnitario: 20, descuentoPct: 0, impuestoPct: 13 }, // subtotal 20
    ]);
    expect(totales.subtotal).toBe(38);
    expect(totales.descuento).toBe(2);
    expect(totales.impuesto).toBe(4.94);
    expect(totales.total).toBe(42.94);
  });

  it("con lista vacía devuelve todo en cero", () => {
    const totales = calcularTotalesVenta([]);
    expect(totales).toEqual({ subtotal: 0, descuento: 0, impuesto: 0, total: 0 });
  });

  it("IVA_PCT es 13", () => {
    expect(IVA_PCT).toBe(13);
  });
});
