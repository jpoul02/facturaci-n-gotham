"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UsuarioDialog } from "@/components/seguridad/usuario-dialog";
import { ROL_LABELS } from "@/components/seguridad/rol-selector";
import type { Usuario } from "@/lib/mock-data/usuarios";

export default function SeguridadPage() {
  const { usuarioActual, usuarios, toggleActivoUsuario } = useAuth();
  const router = useRouter();
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | undefined>(undefined);

  useEffect(() => {
    if (usuarioActual && usuarioActual.rol !== "administrador") {
      router.replace("/");
    }
  }, [usuarioActual, router]);

  if (!usuarioActual || usuarioActual.rol !== "administrador") {
    return null;
  }

  const abrirNuevo = () => {
    setUsuarioEditando(undefined);
    setDialogAbierto(true);
  };

  const abrirEditar = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setDialogAbierto(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Seguridad</h1>
        <Button className="h-10" onClick={abrirNuevo}>
          + Nuevo usuario
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((usuario) => {
              const esUsuarioActual = usuario.id === usuarioActual.id;
              return (
                <TableRow key={usuario.id}>
                  <TableCell>{usuario.nombre}</TableCell>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell>{ROL_LABELS[usuario.rol]}</TableCell>
                  <TableCell>{usuario.activo ? "Sí" : "No"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button className="h-10" variant="outline" onClick={() => abrirEditar(usuario)}>
                        Editar
                      </Button>
                      <Button
                        className="h-10"
                        variant="outline"
                        disabled={esUsuarioActual}
                        title={esUsuarioActual ? "No podés desactivar tu propia cuenta" : undefined}
                        onClick={() => toggleActivoUsuario(usuario.id)}
                      >
                        {usuario.activo ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <UsuarioDialog open={dialogAbierto} onOpenChange={setDialogAbierto} usuario={usuarioEditando} />
    </div>
  );
}
