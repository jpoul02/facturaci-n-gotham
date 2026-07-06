"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useVentas } from "@/lib/ventas-context";

interface TipoImpuestoComboboxProps {
  value: string;
  onChange: (tipoImpuestoId: string) => void;
}

export function TipoImpuestoCombobox({ value, onChange }: TipoImpuestoComboboxProps) {
  const { tiposImpuesto } = useVentas();
  const [open, setOpen] = useState(false);
  const seleccionado = tiposImpuesto.find((t) => t.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            className="h-10 w-full justify-between bg-popover font-normal text-foreground"
          />
        }
      >
        <span className={cn(!value && "text-muted-foreground")}>
          {seleccionado ? `${seleccionado.nombre} (${seleccionado.porcentaje}%)` : "Seleccionar tipo de impuesto..."}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) p-0">
        <Command>
          <CommandInput placeholder="Buscar tipo de impuesto..." className="h-9" />
          <CommandList>
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            <CommandGroup>
              {tiposImpuesto.map((tipo) => (
                <CommandItem
                  key={tipo.id}
                  value={tipo.nombre}
                  onSelect={() => {
                    onChange(tipo.id === value ? "" : tipo.id);
                    setOpen(false);
                  }}
                >
                  {tipo.nombre} ({tipo.porcentaje}%)
                  <Check
                    className={cn("ml-auto h-4 w-4", value === tipo.id ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
