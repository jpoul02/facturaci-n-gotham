import { VentaDetailClient } from "@/components/ventas/venta-detail-client";

export default async function VentaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VentaDetailClient ventaId={id} />;
}
