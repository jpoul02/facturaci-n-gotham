"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useVentas } from "@/lib/ventas-context";
import { StatusBadge } from "@/components/ventas/status-badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function VentasPage() {
  const { ventas, getClientePorId, getFacturaByVentaId } = useVentas();
  const [query, setQuery] = useState("");

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ventas;
    return ventas.filter((v) => getClientePorId(v.clienteId)?.nombre.toLowerCase().includes(q));
  }, [ventas, query, getClientePorId]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Ventas</h1>
        <Link
          href="/ventas/nueva"
          className="inline-flex h-10 items-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-transform active:scale-[0.97]"
        >
          + Nueva venta
        </Link>
      </div>

      <Input
        placeholder="Buscar por cliente..."
        className="h-10 max-w-sm"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Correlativo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.map((venta) => {
              const cliente = getClientePorId(venta.clienteId);
              const factura = getFacturaByVentaId(venta.id);
              return (
                <TableRow key={venta.id}>
                  <TableCell>
                    <Link href={`/ventas/${venta.id}`} className="font-mono text-sm text-brand-600">
                      {factura?.correlativo ?? venta.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>{cliente?.nombre ?? "—"}</TableCell>
                  <TableCell>{new Date(venta.fecha).toLocaleString("es-SV")}</TableCell>
                  <TableCell className="font-mono">${venta.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <StatusBadge estado={venta.estado} />
                  </TableCell>
                </TableRow>
              );
            })}
            {filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                  No hay ventas todavía.{" "}
                  <Link href="/ventas/nueva" className="text-brand-600 underline">
                    Crear la primera
                  </Link>
                  .
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
