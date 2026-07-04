import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { VentasProvider, useVentas, __setRandomForTesting } from "./ventas-context";
import type { LineaVenta } from "./types";
import type { ReactNode } from "react";

function wrapper({ children }: { children: ReactNode }) {
  return <VentasProvider>{children}</VentasProvider>;
}

const lineaEjemplo: LineaVenta = {
  id: "linea-1",
  productoId: "prod-1",
  nombreProducto: "Cemento Fortaleza 42.5kg",
  cantidad: 2,
  precioUnitario: 8.5,
  descuentoPct: 0,
  subtotal: 17,
};

describe("VentasProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("crea una venta, la lleva a 'procesando_dte' y luego a 'autorizada' con factura", () => {
    __setRandomForTesting(() => 0.9);
    const { result } = renderHook(() => useVentas(), { wrapper });

    let ventaId = "";
    act(() => {
      ventaId = result.current.crearVenta("cli-1", [lineaEjemplo]);
    });
    expect(result.current.getVenta(ventaId)?.estado).toBe("confirmada");

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.getVenta(ventaId)?.estado).toBe("procesando_dte");

    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(result.current.getVenta(ventaId)?.estado).toBe("autorizada");
    expect(result.current.getFacturaByVentaId(ventaId)).toBeDefined();
  });

  it("transiciona a 'error_dte' cuando la emisión simulada falla", () => {
    __setRandomForTesting(() => 0.01);
    const { result } = renderHook(() => useVentas(), { wrapper });

    let ventaId = "";
    act(() => {
      ventaId = result.current.crearVenta("cli-1", [lineaEjemplo]);
    });
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(result.current.getVenta(ventaId)?.estado).toBe("error_dte");
    expect(result.current.getFacturaByVentaId(ventaId)).toBeUndefined();
  });

  it("reintentarEmision puede recuperar una venta en error_dte", () => {
    __setRandomForTesting(() => 0.01);
    const { result } = renderHook(() => useVentas(), { wrapper });
    let ventaId = "";
    act(() => {
      ventaId = result.current.crearVenta("cli-1", [lineaEjemplo]);
    });
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(result.current.getVenta(ventaId)?.estado).toBe("error_dte");

    __setRandomForTesting(() => 0.9);
    act(() => {
      result.current.reintentarEmision(ventaId);
    });
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(result.current.getVenta(ventaId)?.estado).toBe("autorizada");
  });

  it("solicitarAnulacion marca la venta como anulada con motivo", () => {
    __setRandomForTesting(() => 0.9);
    const { result } = renderHook(() => useVentas(), { wrapper });
    let ventaId = "";
    act(() => {
      ventaId = result.current.crearVenta("cli-1", [lineaEjemplo]);
    });
    act(() => {
      result.current.solicitarAnulacion(ventaId, "Cliente se arrepintió");
    });
    expect(result.current.getVenta(ventaId)?.estado).toBe("anulada");
    expect(result.current.getVenta(ventaId)?.motivoAnulacion).toBe("Cliente se arrepintió");
  });

  it("registrarCliente agrega un cliente nuevo y buscarClientePorNit lo encuentra", () => {
    const { result } = renderHook(() => useVentas(), { wrapper });
    act(() => {
      result.current.registrarCliente({ nombre: "Nuevo Cliente", tipoDocumento: "DUI", nit: "99999999-9" });
    });
    expect(result.current.buscarClientePorNit("99999999-9")?.nombre).toBe("Nuevo Cliente");
  });
});
