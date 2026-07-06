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
      return true;
    },
    [usuarios]
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    setUsuarioActual(null);
  }, []);

  const crearUsuario = useCallback((data: Omit<Usuario, "id" | "activo">) => {
    const nuevo: Usuario = { ...data, id: crypto.randomUUID(), activo: true };
    setUsuarios((prev) => [...prev, nuevo]);
    return nuevo;
  }, []);

  const actualizarUsuario = useCallback(
    (id: string, data: Partial<Omit<Usuario, "id">>) => {
      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
    },
    []
  );

  const toggleActivoUsuario = useCallback((id: string) => {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, activo: !u.activo } : u)));
  }, []);

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
