"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
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

interface ClienteComboboxProps {
  value: string;
  onChange: (clienteId: string) => void;
  onRegistrarNuevo: () => void;
}

export function ClienteCombobox({ value, onChange, onRegistrarNuevo }: ClienteComboboxProps) {
  const { clientes, buscarClientes } = useVentas();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const seleccionado = clientes.find((c) => c.id === value);
  const clientesFiltrados = buscarClientes(query);

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
          {seleccionado ? seleccionado.nombre : "Buscar cliente..."}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nombre o NIT..."
            className="h-9"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onRegistrarNuevo();
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-brand-600"
              >
                <UserPlus className="h-4 w-4" /> Registrar cliente nuevo
              </button>
            </CommandEmpty>
            <CommandGroup>
              {clientesFiltrados.map((cliente) => (
                <CommandItem
                  key={cliente.id}
                  value={cliente.nombre}
                  onSelect={() => {
                    onChange(cliente.id === value ? "" : cliente.id);
                    setOpen(false);
                  }}
                >
                  {cliente.nombre}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === cliente.id ? "opacity-100" : "opacity-0"
                    )}
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
