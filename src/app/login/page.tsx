"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().trim().min(1, "El correo es obligatorio.").email("Correo inválido."),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

type CampoLogin = keyof z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { usuarioActual, cargando, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CampoLogin, string>>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cargando && usuarioActual) {
      router.replace("/");
    }
  }, [cargando, usuarioActual, router]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const resultado = loginSchema.safeParse({ email, password });
    if (!resultado.success) {
      const errores: Partial<Record<CampoLogin, string>> = {};
      for (const issue of resultado.error.issues) {
        const campo = issue.path[0] as CampoLogin;
        if (!errores[campo]) errores[campo] = issue.message;
      }
      setFieldErrors(errores);
      return;
    }
    setFieldErrors({});

    const ok = login(resultado.data.email, resultado.data.password);
    if (!ok) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.replace("/");
  };

  if (cargando || usuarioActual) {
    return null;
  }

  return (
    <div
      className="relative flex h-screen items-center justify-center overflow-hidden px-4"
      style={{ backgroundImage: "linear-gradient(155deg, #0B1F17 0%, #145C3F 65%, #1C7A50 100%)" }}
    >
      <div
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-300/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(135deg, transparent 49.5%, white 49.5%, white 50.5%, transparent 50.5%)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <div className="text-lg font-semibold tracking-tight">
            Adventure Works<span className="text-emerald-300">·</span>Facturación
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white p-8 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="text-lg font-semibold text-ink-900">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-slate-500">Ingresá con tu correo corporativo.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                className="h-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {fieldErrors.email && <p className="text-sm text-error-700">{fieldErrors.email}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={mostrarPassword ? "text" : "password"}
                  className="h-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword((v) => !v)}
                  aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-slate-400 hover:text-slate-600"
                >
                  {mostrarPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-sm text-error-700">{fieldErrors.password}</p>
              )}
            </div>
            {error && <p className="text-sm text-error-700">{error}</p>}
            <Button type="submit" className="h-10">
              Entrar
            </Button>
          </form>
        </div>

        <p className="relative mt-6 text-center text-xs text-white/40">
          Desarrollado por GOTHAM © {new Date().getFullYear()}. Uso interno de Adventure Works.
        </p>
      </div>
    </div>
  );
}
