"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useVentas } from "@/lib/ventas-context";

interface AnulacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ventaId: string;
}

export function AnulacionDialog({ open, onOpenChange, ventaId }: AnulacionDialogProps) {
  const { solicitarAnulacion } = useVentas();
  const [motivo, setMotivo] = useState("");

  const handleConfirmar = () => {
    if (!motivo.trim()) return;
    solicitarAnulacion(ventaId, motivo.trim());
    toast.success("Anulación solicitada");
    setMotivo("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar anulación</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="motivo">Motivo</Label>
          <Textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
        <DialogFooter>
          <Button className="h-10" variant="destructive" onClick={handleConfirmar} disabled={!motivo.trim()}>
            Confirmar anulación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
