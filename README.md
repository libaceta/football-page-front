# Football Page — Histórico de torneos

Web para visualizar torneos de fútbol con formato de cuadro (bracket): fase de
grupos, eliminatorias, trofeo del campeón y línea de tiempo. Primera etapa:
**Mundial 2026**. El modelo de dominio ya contempla otros torneos (Libertadores,
Champions) y ligas locales para etapas futuras.

Stack: **Angular 21** (standalone, signals, zoneless) + **Tailwind CSS v4**.

## Desarrollo

```bash
npm start        # ng serve -> http://localhost:4200
npm run build    # build de producción en dist/
npm test         # tests con Vitest
```

La ruta raíz redirige a `/tournaments/world-cup/2026`.

## Arquitectura

```
src/app/
  core/
    config/api.config.ts        # InjectionToken API_CONFIG (baseUrl)
    models/tournament.model.ts  # modelo de dominio (copa y liga)
    services/tournament.service.ts
    utils/flag.util.ts          # ISO alpha-2 -> emoji de bandera
  features/tournament/
    tournament-page/            # contenedor (carga edición por ruta, signals)
    components/                 # match-card, group-panel, bracket-tree,
                                # champion-trophy, third-place, stage-timeline
public/mock/tournaments/        # fixtures JSON = mock del backend
```

## Datos: mock → backend real

Los datos se piden por `HttpClient` contra fixtures JSON en `public/mock`. Para
conectar el backend real basta con cambiar `baseUrl` en
`src/app/core/config/api.config.ts` (idealmente vía environment). El service y
los componentes no cambian. La URL es:

```
{baseUrl}/tournaments/{type}-{year}.json
```

## Agregar un torneo / edición

1. Crear el fixture `public/mock/tournaments/{type}-{year}.json` siguiendo las
   interfaces de `tournament.model.ts`.
2. Navegar a `/tournaments/{type}/{year}`.

Para formato liga (a futuro) el modelo ya define `Edition.standings`; falta una
vista de tabla análoga a `group-panel`.
