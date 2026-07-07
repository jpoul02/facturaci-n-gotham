"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVentas } from "@/lib/ventas-context";
import { calcularSubtotalLinea } from "@/lib/calculos";
import type { LineaVenta, Producto } from "@/lib/types";

interface CarritoBuilderProps {
  lineas: LineaVenta[];
  onChange: (lineas: LineaVenta[]) => void;
}

export function CarritoBuilder({ lineas, onChange }: CarritoBuilderProps) {
  const { buscarProductos, getTipoImpuestoPorId } = useVentas();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resultados = query.trim() ? buscarProductos(query) : [];

  const agregarProducto = (producto: Producto) => {
    if (!producto.activo) {
      setError(`"${producto.nombre}" no está disponible actualmente.`);
      setQuery("");
      return;
    }
    setError(null);
    setQuery("");

    const existente = lineas.find((l) => l.productoId === producto.id);
    if (existente) {
      onChange(
        lineas.map((l) =>
          l.productoId === producto.id
            ? {
                ...l,
                cantidad: l.cantidad + 1,
                subtotal: calcularSubtotalLinea({
                  cantidad: l.cantidad + 1,
                  precioUnitario: l.precioUnitario,
                  descuentoPct: l.descuentoPct,
                }),
              }
            : l
        )
      );
      return;
    }

    const nueva: LineaVenta = {
      id: crypto.randomUUID(),
      productoId: producto.id,
      nombreProducto: producto.nombre,
      cantidad: 1,
      precioUnitario: producto.precio,
      descuentoPct: 0,
      impuestoPct: getTipoImpuestoPorId(producto.tipoImpuestoId)?.porcentaje ?? 0,
      subtotal: calcularSubtotalLinea({ cantidad: 1, precioUnitario: producto.precio, descuentoPct: 0 }),
    };
    onChange([...lineas, nueva]);
  };

  const actualizarLinea = (id: string, cambios: Partial<Pick<LineaVenta, "cantidad" | "descuentoPct">>) => {
    onChange(
      lineas.map((l) => {
        if (l.id !== id) return l;
        const actualizada = { ...l, ...cambios };
        return { ...actualizada, subtotal: calcularSubtotalLinea(actualizada) };
      })
    );
  };

  const eliminarLinea = (id: string) => onChange(lineas.filter((l) => l.id !== id));

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Input
          placeholder="Buscar producto por nombre o código..."
          className="h-10"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError(null);
          }}
        />
        {resultados.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-md">
            {resultados.map((producto) => (
              <li key={producto.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50",
                    !producto.activo && "text-slate-400"
                  )}
                  onClick={() => agregarProducto(producto)}
                >
                  <span>
                    {producto.nombre}
                    {!producto.activo && " (no disponible)"}
                  </span>
                  <span className="font-mono text-slate-500">${producto.precio.toFixed(2)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-error-700">{error}</p>}

      {lineas.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-slate-500">
          Agrega productos buscándolos arriba.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="p-2 font-normal">Producto</th>
                <th className="p-2 font-normal">Cant.</th>
                <th className="p-2 font-normal">Desc. %</th>
                <th className="p-2 text-right font-normal">Subtotal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lineas.map((linea) => (
                <tr key={linea.id} className="border-t">
                  <td className="p-2">{linea.nombreProducto}</td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min={1}
                      className="h-9 w-16"
                      value={linea.cantidad}
                      onChange={(e) =>
                        actualizarLinea(linea.id, { cantidad: Math.max(1, Number(e.target.value)) })
                      }
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="h-9 w-16"
                      value={linea.descuentoPct}
                      onChange={(e) =>
                        actualizarLinea(linea.id, {
                          descuentoPct: Math.min(100, Math.max(0, Number(e.target.value))),
                        })
                      }
                    />
                  </td>
                  <td className="p-2 text-right font-mono">${linea.subtotal.toFixed(2)}</td>
                  <td className="p-2 text-right">
                    <Button variant="ghost" size="icon" onClick={() => eliminarLinea(linea.id)}>
                      <Trash2 className="h-4 w-4 text-error-700" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
