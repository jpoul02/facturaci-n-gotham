import { cn } from "@/lib/utils";

const PASOS = ["Cliente", "Carrito", "Pago", "Confirmar"] as const;

export function VentaStepper({ pasoActual }: { pasoActual: number }) {
  return (
    <ol className="flex items-center gap-1 text-sm sm:gap-2">
      {PASOS.map((paso, i) => {
        const numero = i + 1;
        const activo = numero === pasoActual;
        const completado = numero < pasoActual;
        return (
          <li key={paso} className="flex items-center gap-1.5 sm:gap-2">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs",
                activo && "bg-brand-600 text-white",
                completado && "bg-brand-600/15 text-brand-600",
                !activo && !completado && "bg-slate-100 text-slate-400"
              )}
            >
              {numero}
            </span>
            <span className={cn("hidden sm:inline", activo ? "font-medium text-ink-900" : "text-slate-400")}>
              {paso}
            </span>
            {numero < PASOS.length && <span className="mx-1 h-px w-4 shrink-0 bg-slate-200 sm:mx-2 sm:w-6" />}
          </li>
        );
      })}
    </ol>
  );
}
