import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VentasProvider, __setRandomForTesting } from "@/lib/ventas-context";
import NuevaVentaPage from "./page";

// jsdom doesn't implement ResizeObserver, which cmdk (used by the Command
// list inside ClienteCombobox) relies on internally. Polyfill it here so the
// combobox can mount in this integration test.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

// jsdom also doesn't implement scrollIntoView, which cmdk calls when
// highlighting items in the list.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function renderPage() {
  return render(
    <VentasProvider>
      <NuevaVentaPage />
    </VentasProvider>
  );
}

describe("Flujo POS - nueva venta", () => {
  beforeEach(() => {
    __setRandomForTesting(() => 0.9);
    pushMock.mockClear();
  });

  it("el botón Confirmar venta empieza deshabilitado", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /confirmar venta/i })).toBeDisabled();
  });

  it("permite buscar cliente, agregar producto y confirmar la venta", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByText("Karla Beatriz Hernández"));

    await user.type(screen.getByPlaceholderText(/buscar producto/i), "Cemento");
    await user.click(await screen.findByText(/Cemento Fortaleza/));

    const botonConfirmar = screen.getByRole("button", { name: /confirmar venta/i });
    expect(botonConfirmar).toBeEnabled();

    await user.click(botonConfirmar);

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock.mock.calls[0][0]).toMatch(/^\/ventas\//);
  });
});
