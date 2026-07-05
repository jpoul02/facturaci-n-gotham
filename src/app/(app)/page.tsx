"use client";

import Link from "next/link";
import { useVentas } from "@/lib/ventas-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { ventas } = useVentas();

  const hoy = new Date().toDateString();
  const ventasHoy = ventas.filter((v) => new Date(v.fecha).toDateString() === hoy);
  const totalHoy = ventasHoy.reduce((acc, v) => acc + v.total, 0);
  const pendientes = ventas.filter(
    (v) => v.estado === "procesando_dte" || v.estado === "confirmada"
  ).length;
  const autorizadas = ventas.filter((v) => v.estado === "autorizada").length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Ventas hoy</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-3xl font-semibold">{ventasHoy.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Monto total hoy</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-3xl font-semibold">${totalHoy.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Pendientes / Autorizadas</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-3xl font-semibold">
            {pendientes} / {autorizadas}
          </CardContent>
        </Card>
      </div>

      <Link
        href="/ventas/nueva"
        className="inline-flex w-fit items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-transform active:scale-[0.97]"
      >
        + Nueva venta
      </Link>
    </div>
  );
}
