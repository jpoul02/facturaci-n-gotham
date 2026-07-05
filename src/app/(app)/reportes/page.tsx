"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useVentas } from "@/lib/ventas-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ventas/status-badge";
import type { Cliente, EstadoVenta, Producto } from "@/lib/types";

const ESTADOS: EstadoVenta[] = [
  "borrador",
  "confirmada",
  "procesando_dte",
  "autorizada",
  "error_dte",
  "anulacion_solicitada",
  "anulada",
];

export default function ReportesPage() {
  const { usuarioActual } = useAuth();
  const router = useRouter();
  const { ventas, productos, getClientePorId } = useVentas();

  useEffect(() => {
    if (usuarioActual && usuarioActual.rol === "vendedor") {
      router.replace("/");
    }
  }, [usuarioActual, router]);

  const ventasAutorizadas = useMemo(
    () => ventas.filter((v) => v.estado === "autorizada"),
    [ventas]
  );

  const totalFacturado = useMemo(
    () => ventasAutorizadas.reduce((acc, v) => acc + v.total, 0),
    [ventasAutorizadas]
  );

  const ventasAnuladas = useMemo(
    () => ventas.filter((v) => v.estado === "anulada").length,
    [ventas]
  );

  const anulacionesPendientes = useMemo(
    () => ventas.filter((v) => v.estado === "anulacion_solicitada").length,
    [ventas]
  );

  const conteoPorEstado = useMemo(() => {
    const conteo = new Map<EstadoVenta, number>();
    for (const estado of ESTADOS) conteo.set(estado, 0);
    for (const v of ventas) conteo.set(v.estado, (conteo.get(v.estado) ?? 0) + 1);
    return conteo;
  }, [ventas]);

  const topClientes = useMemo(() => {
    const totalesPorCliente = new Map<string, number>();
    for (const v of ventasAutorizadas) {
      totalesPorCliente.set(v.clienteId, (totalesPorCliente.get(v.clienteId) ?? 0) + v.total);
    }
    const conCliente: { cliente: Cliente; total: number }[] = [];
    for (const [clienteId, total] of totalesPorCliente.entries()) {
      const cliente = getClientePorId(clienteId);
      if (cliente) conCliente.push({ cliente, total });
    }
    return conCliente.sort((a, b) => b.total - a.total).slice(0, 5);
  }, [ventasAutorizadas, getClientePorId]);

  const topProductos = useMemo(() => {
    const cantidadPorProducto = new Map<string, number>();
    for (const v of ventasAutorizadas) {
      for (const linea of v.lineas) {
        cantidadPorProducto.set(
          linea.productoId,
          (cantidadPorProducto.get(linea.productoId) ?? 0) + linea.cantidad
        );
      }
    }
    const conProducto: { producto: Producto; cantidad: number }[] = [];
    for (const [productoId, cantidad] of cantidadPorProducto.entries()) {
      const producto = productos.find((p) => p.id === productoId);
      if (producto) conProducto.push({ producto, cantidad });
    }
    return conProducto.sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
  }, [ventasAutorizadas, productos]);

  if (!usuarioActual || usuarioActual.rol === "vendedor") {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink-900">Reportes</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Total de ventas</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-3xl font-semibold">{ventas.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Total facturado</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-3xl font-semibold">
            ${totalFacturado.toFixed(2)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Ventas anuladas</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-3xl font-semibold">{ventasAnuladas}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Anulaciones pendientes</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-3xl font-semibold">{anulacionesPendientes}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Ventas por estado</h2>
          <ul className="flex flex-col gap-2">
            {ESTADOS.map((estado) => (
              <li key={estado} className="flex items-center justify-between">
                <StatusBadge estado={estado} />
                <span className="font-mono text-sm text-slate-600">{conteoPorEstado.get(estado)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Top clientes</h2>
          {topClientes.length === 0 ? (
            <p className="text-sm text-slate-500">Sin datos todavía.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {topClientes.map(({ cliente, total }) => (
                <li key={cliente.id} className="flex items-center justify-between text-sm">
                  <span>{cliente.nombre}</span>
                  <span className="font-mono">${total.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Top productos</h2>
          {topProductos.length === 0 ? (
            <p className="text-sm text-slate-500">Sin datos todavía.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {topProductos.map(({ producto, cantidad }) => (
                <li key={producto.id} className="flex items-center justify-between text-sm">
                  <span>{producto.nombre}</span>
                  <span className="font-mono">{cantidad}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
