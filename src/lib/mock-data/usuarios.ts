export type Rol = "vendedor" | "supervisor" | "administrador";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  activo: boolean;
}

export const usuariosSeed: Usuario[] = [
  { id: "usr-1", nombre: "Ana Beltrán", email: "vendedor@gotham.sv", password: "vendedor123", rol: "vendedor", activo: true },
  { id: "usr-2", nombre: "Carlos Reyes", email: "supervisor@gotham.sv", password: "supervisor123", rol: "supervisor", activo: true },
  { id: "usr-3", nombre: "Lucía Hernández", email: "admin@gotham.sv", password: "admin123", rol: "administrador", activo: true },
];
