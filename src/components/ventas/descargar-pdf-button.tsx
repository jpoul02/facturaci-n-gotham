"use client";

import { useEffect, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { FacturaPdf } from "@/components/ventas/factura-pdf";
import type { Cliente, Factura, Venta } from "@/lib/types";

interface DescargarPdfButtonProps {
  venta: Venta;
  cliente?: Cliente;
  factura?: Factura;
}

export function DescargarPdfButton({ venta, cliente, factura }: DescargarPdfButtonProps) {
  const [qrConsultaDataUrl, setQrConsultaDataUrl] = useState<string>();
  const [qrJsonDataUrl, setQrJsonDataUrl] = useState<string>();

  useEffect(() => {
    if (!factura) return;
    const consultaUrl = `https://admin.factura.gob.sv/consultaPublica?ambiente=00&codGen=${factura.codigoGeneracion}&fechaEmi=${factura.fechaEmision.slice(0, 10)}`;
    const json = JSON.stringify({
      codigoGeneracion: factura.codigoGeneracion,
      numeroControl: factura.numeroControl,
      selloRecepcion: factura.selloRecepcion,
      total: venta.total,
    });
    QRCode.toDataURL(consultaUrl, { margin: 1 }).then(setQrConsultaDataUrl);
    QRCode.toDataURL(json, { margin: 1 }).then(setQrJsonDataUrl);
  }, [factura, venta.total]);

  const nombreArchivo = `venta-${factura?.correlativo ?? venta.id.slice(0, 8)}.pdf`;
  const listo = !factura || (qrConsultaDataUrl && qrJsonDataUrl);

  if (!listo) {
    return (
      <Button className="h-10" disabled>
        Generando PDF...
      </Button>
    );
  }

  return (
    <PDFDownloadLink
      document={
        <FacturaPdf
          venta={venta}
          cliente={cliente}
          factura={factura}
          qrConsultaDataUrl={qrConsultaDataUrl}
          qrJsonDataUrl={qrJsonDataUrl}
        />
      }
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
