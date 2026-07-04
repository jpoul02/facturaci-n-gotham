import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { VentasProvider } from "@/lib/ventas-context";
import { CarritoBuilder } from "./carrito-builder";
import type { LineaVenta } from "@/lib/types";

function Harness() {
  const [lineas, setLineas] = useState<LineaVenta[]>([]);
  return <CarritoBuilder lineas={lineas} onChange={setLineas} />;
}

function renderHarness() {
  return render(
    <VentasProvider>
      <Harness />
    </VentasProvider>
  );
}

describe("CarritoBuilder", () => {
  it("agrega un producto activo al carrito con su subtotal", async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.type(screen.getByPlaceholderText(/buscar producto/i), "Cemento");
    await user.click(await screen.findByText(/Cemento Fortaleza/));

    expect(screen.getByText(/Cemento Fortaleza/)).toBeInTheDocument();
    expect(screen.getByText("$8.50")).toBeInTheDocument();
  });

  it("bloquea un producto inactivo y muestra un mensaje inline (sin agregarlo)", async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.type(screen.getByPlaceholderText(/buscar producto/i), "Cinta métrica");
    await user.click(await screen.findByText(/Cinta métrica/));

    expect(await screen.findByText(/no está disponible actualmente/i)).toBeInTheDocument();
    expect(screen.queryByText("$3.25")).not.toBeInTheDocument();
  });
});
