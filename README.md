# Adventure Works · Facturación

Prototipo de sistema interno de ventas y facturación electrónica (DTE, El Salvador) para Adventure Works. Frontend-only — sin backend real, la emisión de comprobantes se simula.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (`@base-ui/react`) · Zod · Recharts · Vitest

## Empezar

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) — te redirige a `/login`. Credenciales de prueba en [`docs/demo-usuarios.md`](docs/demo-usuarios.md).

## Documentación

- **[Manual de usuario](docs/manual-usuario.md)** — guía completa: roles, flujo de venta, aprobaciones, reportes, catálogos, seguridad, auditoría.
- [Usuarios de prueba](docs/demo-usuarios.md)
- [Correr dos `next dev` en paralelo](docs/dev-multiple-instances.md)
- [`docs/superpowers/`](docs/superpowers/) — specs y planes de cada sub-proyecto (histórico de diseño/implementación)

## Deploy

Incluye `Dockerfile` (multi-stage, Next.js `output: "standalone"`) listo para Railway u otro host con soporte Docker — no necesita configuración adicional, Railway detecta el Dockerfile solo.

## Tests

```bash
npm test
```
