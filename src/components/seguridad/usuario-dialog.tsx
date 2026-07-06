"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RolSelector } from "@/components/seguridad/rol-selector";
import { useAuth } from "@/lib/auth-context";
import type { Rol, Usuario } from "@/lib/mock-data/usuarios";

interface UsuarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario?: Usuario;
}

export function UsuarioDialog({ open, onOpenChange, usuario }: UsuarioDialogProps) {
  const { crearUsuario, actualizarUsuario } = useAuth();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<Rol | undefined>(undefined);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setNombre(usuario?.nombre ?? "");
      setEmail(usuario?.email ?? "");
      setRol(usuario?.rol);
      setPassword("");
    }
  }, [open, usuario]);

  const puedeGuardar =
    nombre.trim() !== "" &&
    email.trim() !== "" &&
    rol !== undefined &&
    (usuario ? true : password.trim() !== "");

  const handleSubmit = () => {
    if (!puedeGuardar || !rol) return;
    if (usuario) {
      actualizarUsuario(usuario.id, {
        nombre: nombre.trim(),
        email: email.trim(),
        rol,
        ...(password.trim() !== "" && { password: password.trim() }),
      });
      toast.success("Usuario actualizado");
    } else {
      crearUsuario({
        nombre: nombre.trim(),
        email: email.trim(),
        rol,
        password: password.trim(),
      });
      toast.success("Usuario creado");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{usuario ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" className="h-10" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              className="h-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Rol</Label>
            <RolSelector value={rol} onChange={setRol} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              className="h-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={usuario ? "Dejar en blanco para no cambiar" : undefined}
            />
          </div>
        </div>
        <DialogFooter>
          <Button className="h-10" onClick={handleSubmit} disabled={!puedeGuardar}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
