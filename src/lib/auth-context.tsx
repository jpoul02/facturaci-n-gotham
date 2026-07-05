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
  cargando: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
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
  }, []);

  const login = useCallback((email: string, password: string) => {
    const usuario = usuariosSeed.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );
    if (!usuario) return false;
    window.localStorage.setItem(SESSION_KEY, usuario.id);
    setUsuarioActual(usuario);
    return true;
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    setUsuarioActual(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuarioActual, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
