import { cn } from "@/lib/utils";
import type { EstadoVenta } from "@/lib/types";

const ESTADO_LABEL: Record<EstadoVenta, string> = {
  borrador: "Borrador",
  confirmada: "Confirmada",
  procesando_dte: "Procesando",
  autorizada: "Autorizada",
  error_dte: "Error DTE",
  anulacion_solicitada: "Anulación solicitada",
  anulada: "Anulada",
};

const SELLO_ESTADOS: EstadoVenta[] = ["autorizada", "anulada", "error_dte"];

const PILL_STYLES: Partial<Record<EstadoVenta, string>> = {
  borrador: "bg-slate-100 text-slate-600",
  confirmada: "bg-slate-100 text-slate-600",
  procesando_dte: "bg-pending-700/10 text-pending-700",
  anulacion_solicitada: "bg-pending-700/10 text-pending-700",
};

const SELLO_STYLES: Partial<Record<EstadoVenta, string>> = {
  autorizada: "border-success-700 text-success-700",
  anulada: "border-error-700 text-error-700",
  error_dte: "border-error-700 text-error-700",
};

export function StatusBadge({ estado }: { estado: EstadoVenta }) {
  const label = ESTADO_LABEL[estado];

  if (SELLO_ESTADOS.includes(estado)) {
    return (
      <span
        data-testid="status-sello"
        className={cn(
          "sello-badge inline-flex items-center rounded-md border-2 border-dashed px-2.5 py-1 text-xs font-semibold uppercase tracking-wider -rotate-6",
          SELLO_STYLES[estado]
        )}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      data-testid="status-pill"
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        PILL_STYLES[estado]
      )}
    >
      {label}
    </span>
  );
}
