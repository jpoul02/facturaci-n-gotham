"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { FacturaPdf } from "@/components/ventas/factura-pdf";
import type { Cliente, Factura, Venta } from "@/lib/types";

interface DescargarPdfButtonProps {
  venta: Venta;
  cliente?: Cliente;
  factura?: Factura;
}

export function DescargarPdfButton({ venta, cliente, factura }: DescargarPdfButtonProps) {
  const nombreArchivo = `venta-${factura?.correlativo ?? venta.id.slice(0, 8)}.pdf`;

  return (
    <PDFDownloadLink
      document={<FacturaPdf venta={venta} cliente={cliente} factura={factura} />}
      fileName={nombreArchivo}
    >
      {({ loading }) => (
        <Button className="h-10" disabled={loading}>
          {loading ? "Generando PDF..." : "Descargar PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
