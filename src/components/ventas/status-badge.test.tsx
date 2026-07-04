import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it.each(["autorizada", "anulada", "error_dte"] as const)(
    "renderiza un sello para el estado terminal '%s'",
    (estado) => {
      render(<StatusBadge estado={estado} />);
      expect(screen.getByTestId("status-sello")).toBeInTheDocument();
    }
  );

  it.each(["borrador", "confirmada", "procesando_dte", "anulacion_solicitada"] as const)(
    "renderiza una pill normal para el estado provisional '%s'",
    (estado) => {
      render(<StatusBadge estado={estado} />);
      expect(screen.getByTestId("status-pill")).toBeInTheDocument();
    }
  );

  it("muestra la etiqueta en español correspondiente", () => {
    render(<StatusBadge estado="autorizada" />);
    expect(screen.getByText("Autorizada")).toBeInTheDocument();
  });
});
