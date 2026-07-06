"use client";

import { Button } from "@/components/ui/button";
import type { Rol } from "@/lib/mock-data/usuarios";

export const ROL_LABELS: Record<Rol, string> = {
  vendedor: "Vendedor",
  supervisor: "Supervisor",
  administrador: "Administrador",
};

const OPCIONES: Rol[] = ["vendedor", "supervisor", "administrador"];

interface RolSelectorProps {
  value: Rol | undefined;
  onChange: (rol: Rol) => void;
}

export function RolSelector({ value, onChange }: RolSelectorProps) {
  return (
    <div className="flex gap-2">
      {OPCIONES.map((rol) => (
        <Button
          key={rol}
          type="button"
          variant={value === rol ? "default" : "outline"}
          className="h-10 flex-1"
          onClick={() => onChange(rol)}
        >
          {ROL_LABELS[rol]}
        </Button>
      ))}
    </div>
  );
}
