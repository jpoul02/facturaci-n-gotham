# Correr dos `next dev` en paralelo

Next.js bloquea un segundo `next dev` sobre el mismo proyecto (lockfile en `.next/`), sin importar el puerto. Para levantar una segunda instancia (ej. vos en 3000, otra persona en 3001), la segunda instancia necesita su propio `distDir` — ya configurado en `next.config.ts` vía la variable `NEXT_DIST_DIR`.

## PowerShell

```powershell
$env:NEXT_DIST_DIR = ".next-preview"
npm run dev -- -p 3001
```

## Bash / Git Bash

```bash
NEXT_DIST_DIR=.next-preview npm run dev -- -p 3001
```

Sin la variable, corre normal contra `.next/` en el puerto que le pases. `.next-*` ya está en `.gitignore`.
