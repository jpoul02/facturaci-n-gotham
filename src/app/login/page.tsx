"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { usuariosSeed } from "@/lib/mock-data/usuarios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const { usuarioActual, cargando, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cargando && usuarioActual) {
      router.replace("/");
    }
  }, [cargando, usuarioActual, router]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const ok = login(email, password);
    if (!ok) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.replace("/");
  };

  const entrarComo = (usuarioEmail: string, usuarioPassword: string) => {
    setError(null);
    if (login(usuarioEmail, usuarioPassword)) {
      router.replace("/");
    }
  };

  if (cargando || usuarioActual) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-lg border bg-white p-8 shadow-sm">
        <div className="mb-6 text-center text-lg font-semibold tracking-tight text-ink-900">
          GOTHAM<span className="text-brand-600">·</span>Facturación
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              className="h-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-error-700">{error}</p>}
          <Button type="submit" className="h-10">
            Entrar
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          Acceso rápido de prueba
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="flex flex-col gap-2">
          {usuariosSeed.map((usuario) => (
            <Button
              key={usuario.id}
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => entrarComo(usuario.email, usuario.password)}
            >
              Entrar como {usuario.nombre.split(" ")[0]} ({usuario.rol})
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
