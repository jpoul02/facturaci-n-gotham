import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { VentasProvider, __setRandomForTesting, useVentas } from "@/lib/ventas-context";
import { VentaDetailClient } from "./venta-detail-client";
import type { LineaVenta } from "@/lib/types";

const lineaEjemplo: LineaVenta = {
  id: "linea-1",
  productoId: "prod-1",
  nombreProducto: "Cemento Fortaleza 42.5kg",
  cantidad: 1,
  precioUnitario: 8.5,
  descuentoPct: 0,
  subtotal: 8.5,
};

function Harness({ onReady }: { onReady: (ventaId: string) => void }) {
  const { crearVenta } = useVentas();
  const [ventaId, setVentaId] = useState<string | null>(null);

  useEffect(() => {
    const id = crearVenta("cli-1", [lineaEjemplo]);
    setVentaId(id);
    onReady(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ventaId) return null;
  return <VentaDetailClient ventaId={ventaId} />;
}

describe("VentaDetailClient", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("muestra el banner de error y permite reintentar la emisión", async () => {
    __setRandomForTesting(() => 0.01); // fuerza error_dte
    const user = userEvent.setup({ delay: null });
    render(
      <VentasProvider>
        <Harness onReady={() => {}} />
      </VentasProvider>
    );

    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(screen.getByText(/rechazó la emisión/i)).toBeInTheDocument();

    __setRandomForTesting(() => 0.9); // el reintento sí tiene éxito
    await user.click(screen.getByRole("button", { name: /reintentar emisión/i }));
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByTestId("status-sello")).toHaveTextContent("Autorizada");
  });

  it("permite solicitar anulación de una venta autorizada", async () => {
    __setRandomForTesting(() => 0.9);
    const user = userEvent.setup({ delay: null });
    render(
      <VentasProvider>
        <Harness onReady={() => {}} />
      </VentasProvider>
    );

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(screen.getByRole("button", { name: /solicitar anulación/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /solicitar anulación/i }));
    await user.type(screen.getByLabelText(/motivo/i), "Cliente se arrepintió");
    await user.click(screen.getByRole("button", { name: /confirmar anulación/i }));

    expect(screen.getByTestId("status-pill")).toHaveTextContent("Anulación solicitada");
    expect(screen.getByText(/esperando aprobación del supervisor/i)).toBeInTheDocument();
  });
});
