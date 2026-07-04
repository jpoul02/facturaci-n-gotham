import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VentasProvider } from "@/lib/ventas-context";
import { ClienteNuevoDialog } from "./cliente-nuevo-dialog";

function renderDialog(onCreado = vi.fn()) {
  render(
    <VentasProvider>
      <ClienteNuevoDialog open onOpenChange={() => {}} onCreado={onCreado} />
    </VentasProvider>
  );
  return onCreado;
}

describe("ClienteNuevoDialog", () => {
  it("crea un cliente nuevo y llama onCreado con su id", async () => {
    const user = userEvent.setup();
    const onCreado = renderDialog();

    await user.type(screen.getByLabelText(/nombre completo/i), "Panadería La Espiga");
    await user.type(screen.getByLabelText(/nit \/ dui/i), "0614-333333-101-9");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(onCreado).toHaveBeenCalledTimes(1);
    const idCreado = onCreado.mock.calls[0][0];
    expect(typeof idCreado).toBe("string");
  });

  it("si el NIT ya existe, reutiliza el cliente existente en vez de duplicar", async () => {
    const user = userEvent.setup();
    const onCreado = renderDialog();

    await user.type(screen.getByLabelText(/nombre completo/i), "Otro Nombre");
    await user.type(screen.getByLabelText(/nit \/ dui/i), "04521789-3"); // NIT de Karla, del seed
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(onCreado).toHaveBeenCalledWith("cli-2");
  });

  it("el botón Guardar está deshabilitado sin nombre o NIT", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });
});
