"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useVentas } from "@/lib/ventas-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EstadoVenta } from "@/lib/types";

const ESTADOS: EstadoVenta[] = [
  "borrador",
  "confirmada",
  "procesando_dte",
  "autorizada",
  "error_dte",
  "anulacion_solicitada",
  "anulada",
];

const ESTADO_LABEL: Record<EstadoVenta, string> = {
  borrador: "Borrador",
  confirmada: "Confirmada",
  procesando_dte: "Procesando",
  autorizada: "Autorizada",
  error_dte: "Error DTE",
  anulacion_solicitada: "Anulación sol.",
  anulada: "Anulada",
};

// Reuses the same semantics already established by StatusBadge — success/pending/error
// tokens, plus a muted neutral for the provisional states — instead of inventing a new
// categorical scale for the same estados.
const ESTADO_COLOR: Record<EstadoVenta, string> = {
  borrador: "#94A3B8",
  confirmada: "#94A3B8",
  procesando_dte: "#B9770E",
  autorizada: "#147A52",
  error_dte: "#B23A3A",
  anulacion_solicitada: "#B9770E",
  anulada: "#B23A3A",
};

const DIA_LABEL = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const cardGlass = "border-0 bg-white/60 shadow-md ring-1 ring-white/60 backdrop-blur-md";

export default function DashboardPage() {
  const { ventas } = useVentas();

  const hoy = new Date().toDateString();
  const ventasHoy = ventas.filter((v) => new Date(v.fecha).toDateString() === hoy);
  const totalHoy = ventasHoy.reduce((acc, v) => acc + v.total, 0);
  const pendientes = ventas.filter(
    (v) => v.estado === "procesando_dte" || v.estado === "confirmada"
  ).length;
  const autorizadas = ventas.filter((v) => v.estado === "autorizada").length;

  const serieDiaria = useMemo(() => {
    const dias: { key: string; label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      dias.push({ key: fecha.toDateString(), label: DIA_LABEL[fecha.getDay()], total: 0 });
    }
    for (const venta of ventas) {
      if (venta.estado !== "autorizada") continue;
      const key = new Date(venta.fecha).toDateString();
      const dia = dias.find((d) => d.key === key);
      if (dia) dia.total += venta.total;
    }
    return dias;
  }, [ventas]);

  const conteoPorEstado = useMemo(
    () =>
      ESTADOS.map((estado) => ({
        estado,
        label: ESTADO_LABEL[estado],
        cantidad: ventas.filter((v) => v.estado === estado).length,
        fill: ESTADO_COLOR[estado],
      })),
    [ventas]
  );

  const hayVentas = ventas.length > 0;

  return (
    <div className="-m-8 min-h-full bg-gradient-to-br from-[#EAF3EE] via-canvas to-[#E7F2EC] p-8">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-ink-900">Dashboard</h1>

        <div
          className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
          style={{ backgroundImage: "linear-gradient(155deg, #0B1F17 0%, #145C3F 65%, #1C7A50 100%)" }}
        >
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-300/15 blur-3xl"
            aria-hidden
          />
          <p className="relative text-xs uppercase tracking-wide text-white/50">Resumen de hoy</p>
          <p className="relative mt-2 max-w-2xl text-lg font-medium leading-snug">
            {ventasHoy.length === 0
              ? "Todavía no hay ventas registradas hoy."
              : `${ventasHoy.length} ventas por $${totalHoy.toFixed(2)} hoy, con ${pendientes} pendientes de autorizar.`}
          </p>
          <div className="relative mt-4 flex gap-3">
            <Link
              href="/ventas/nueva"
              className={cn(buttonVariants({ variant: "default" }), "h-10 bg-white text-ink-900 hover:bg-white/90")}
            >
              + Nueva venta
            </Link>
            <Link
              href="/reportes"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-10 border-white/30 bg-transparent text-white hover:bg-white/10"
              )}
            >
              Ver reportes
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className={cardGlass}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">Ventas hoy</CardTitle>
            </CardHeader>
            <CardContent className="font-mono text-3xl font-semibold text-ink-900">
              {ventasHoy.length}
            </CardContent>
          </Card>
          <Card className={cardGlass}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">Monto total hoy</CardTitle>
            </CardHeader>
            <CardContent className="font-mono text-3xl font-semibold text-ink-900">
              ${totalHoy.toFixed(2)}
            </CardContent>
          </Card>
          <Card className={cardGlass}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">Pendientes / Autorizadas</CardTitle>
            </CardHeader>
            <CardContent className="font-mono text-3xl font-semibold text-ink-900">
              {pendientes} / {autorizadas}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className={cardGlass}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">Facturado — últimos 7 días</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {hayVentas ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serieDiaria} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "#64748B" }}
                    />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748B" }} width={40} />
                    <Tooltip
                      formatter={(value) => [`$${Number(value).toFixed(2)}`, "Facturado"]}
                      contentStyle={{ borderRadius: 8, borderColor: "#E2E8F0", fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#145C3F"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#145C3F" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-slate-500">
                  Sin datos todavía.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={cardGlass}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">Ventas por estado</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {hayVentas ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conteoPorEstado} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis hide allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => [Number(value), "Ventas"]}
                      contentStyle={{ borderRadius: 8, borderColor: "#E2E8F0", fontSize: 12 }}
                    />
                    <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {conteoPorEstado.map((entry) => (
                        <Cell key={entry.estado} fill={entry.fill} />
                      ))}
                      <LabelList dataKey="cantidad" position="top" style={{ fontSize: 11, fill: "#334155" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-slate-500">
                  Sin datos todavía.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
