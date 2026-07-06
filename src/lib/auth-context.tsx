"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usuariosSeed, type Usuario } from "@/lib/mock-data/usuarios";
import { useAuditoria } from "@/lib/auditoria-context";

const SESSION_KEY = "gotham_sesion";

interface AuthContextValue {
  usuarioActual: Usuario | null;
  usuarios: Usuario[];
  cargando: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  crearUsuario: (data: Omit<Usuario, "id" | "activo">) => Usuario;
  actualizarUsuario: (id: string, data: Partial<Omit<Usuario, "id">>) => void;
  toggleActivoUsuario: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { registrarEvento } = useAuditoria();
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosSeed);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const id = window.localStorage.getItem(SESSION_KEY);
    if (id) {
      const usuario = usuariosSeed.find((u) => u.id === id);
      if (usuario) {
        setUsuarioActual(usuario);
      } else {
        window.localStorage.removeItem(SESSION_KEY);
      }
    }
    setCargando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    (email: string, password: string) => {
      const usuario = usuarios.find(
        (u) =>
          u.email.toLowerCase() === email.trim().toLowerCase() &&
          u.password === password &&
          u.activo
      );
      if (!usuario) return false;
      window.localStorage.setItem(SESSION_KEY, usuario.id);
      setUsuarioActual(usuario);
      registrarEvento({
        usuarioId: usuario.id,
        usuarioNombre: usuario.nombre,
        accion: "login",
        detalle: `${usuario.nombre} inició sesión`,
      });
      return true;
    },
    [usuarios, registrarEvento]
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    if (usuarioActual) {
      registrarEvento({
        usuarioId: usuarioActual.id,
        usuarioNombre: usuarioActual.nombre,
        accion: "logout",
        detalle: `${usuarioActual.nombre} cerró sesión`,
      });
    }
    setUsuarioActual(null);
  }, [usuarioActual, registrarEvento]);

  const crearUsuario = useCallback(
    (data: Omit<Usuario, "id" | "activo">) => {
      const nuevo: Usuario = { ...data, id: crypto.randomUUID(), activo: true };
      setUsuarios((prev) => [...prev, nuevo]);
      registrarEvento({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: "usuario_creado",
        detalle: `Usuario "${nuevo.nombre}" creado con rol ${nuevo.rol}`,
      });
      return nuevo;
    },
    [usuarioActual, registrarEvento]
  );

  const actualizarUsuario = useCallback(
    (id: string, data: Partial<Omit<Usuario, "id">>) => {
      const usuario = usuarios.find((u) => u.id === id);
      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
      if (usuario) {
        registrarEvento({
          usuarioId: usuarioActual?.id ?? null,
          usuarioNombre: usuarioActual?.nombre ?? "Sistema",
          accion: "usuario_actualizado",
          detalle: `Usuario "${usuario.nombre}" actualizado`,
        });
      }
    },
    [usuarios, usuarioActual, registrarEvento]
  );

  const toggleActivoUsuario = useCallback(
    (id: string) => {
      const usuario = usuarios.find((u) => u.id === id);
      if (!usuario) return;
      const nuevoActivo = !usuario.activo;
      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, activo: nuevoActivo } : u)));
      registrarEvento({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: nuevoActivo ? "usuario_activado" : "usuario_desactivado",
        detalle: `Usuario "${usuario.nombre}" ${nuevoActivo ? "activado" : "desactivado"}`,
      });
    },
    [usuarios, usuarioActual, registrarEvento]
  );

  return (
    <AuthContext.Provider
      value={{
        usuarioActual,
        usuarios,
        cargando,
        login,
        logout,
        crearUsuario,
        actualizarUsuario,
        toggleActivoUsuario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

export function useAuthOpcional() {
  return useContext(AuthContext);
}
