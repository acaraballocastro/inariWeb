# INARI Tours · Operations (frontend)

Frontend de InariOps: reservas, días de tour, asignación de guías, incidencias y notificaciones de la operativa en Japón. Next.js 16 (App Router) + React 19 + Tailwind 4, contra el backend Go `inariops-backend`.

Qué hace, qué falta y problemas conocidos: [FRONTEND_CAPABILITIES.md](FRONTEND_CAPABILITIES.md).

## Arrancar

Requiere Node 24 o posterior (los tests usan el soporte nativo de TypeScript de Node) y el backend en marcha.

```bash
npm install
echo 'NEXT_PUBLIC_API_URL=http://localhost:9142/api/v1' > .env.local
npm run dev        # http://localhost:3000
```

En el backend, `CORS_ORIGIN` y `WEB_URL` deben apuntar a la dirección del frontend.

## Comprobaciones

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # tests de lib/ con node:test
npm run build
```

La CI (`.github/workflows/ci.yml`) ejecuta las cuatro en cada pull request y en `main`.

## Estructura

- `app/`: sólo las rutas; cada `page.tsx` renderiza una pantalla.
- `features/<área>/`: `api.ts` (tipos y llamadas al backend) y `components/` (pantallas).
- `lib/`: cliente HTTP y sesión (`api/`), fechas en JST (`datetime.ts`), estados (`status.ts`), calendario (`calendar.ts`). El código de `lib/` que tiene tests importa con extensión `.ts` para que Node lo ejecute sin compilar.

Todas las fechas se introducen y se muestran en hora de Japón (JST), sea cual sea la zona del navegador.
