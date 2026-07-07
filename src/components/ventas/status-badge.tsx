import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
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

// Kept only to preserve the existing data-testid contract (status-sello vs
// status-pill) — estados fiscalmente terminales vs. provisionales.
const SELLO_ESTADOS: EstadoVenta[] = ["autorizada", "anulada", "error_dte"];

const ESTADO_ICON: Record<EstadoVenta, LucideIcon> = {
  borrador: FileText,
  confirmada: Clock,
  procesando_dte: Loader2,
  autorizada: CheckCircle2,
  error_dte: XCircle,
  anulacion_solicitada: AlertCircle,
  anulada: Ban,
};

const ESTADO_STYLE: Record<EstadoVenta, string> = {
  borrador: "bg-slate-100 text-slate-600",
  confirmada: "bg-slate-100 text-slate-600",
  procesando_dte: "bg-pending-700/10 text-pending-700",
  autorizada: "bg-success-700/10 text-success-700",
  error_dte: "bg-error-700/10 text-error-700",
  anulacion_solicitada: "bg-pending-700/10 text-pending-700",
  anulada: "bg-error-700/10 text-error-700",
};

export function StatusBadge({ estado }: { estado: EstadoVenta }) {
  const label = ESTADO_LABEL[estado];
  const Icon = ESTADO_ICON[estado];
  const testId = SELLO_ESTADOS.includes(estado) ? "status-sello" : "status-pill";

  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        ESTADO_STYLE[estado]
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", estado === "procesando_dte" && "animate-spin")} />
      {label}
    </span>
  );
}
