import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { API_CONFIG } from '../../../core/config/api.config';
import { TournamentService } from '../../../core/services/tournament.service';
import { reconcile } from '../../../core/utils/reconcile.util';
import {
  Edition,
  EditionRef,
  Group,
  KnockoutRound,
  Match,
  Team,
  Tournament,
  TournamentType,
} from '../../../core/models/tournament.model';
import { BracketTree } from '../components/bracket-tree/bracket-tree';
import { ChampionTrophy } from '../components/champion-trophy/champion-trophy';
import { ThirdPlace } from '../components/third-place/third-place';
import { StageTimeline } from '../components/stage-timeline/stage-timeline';
import { GroupStageView } from '../components/group-stage-view/group-stage-view';
import { GroupResults } from '../components/group-results/group-results';
import { TodayMatches } from '../components/today-matches/today-matches';
import { groupGridClass } from '../group-grid.util';
import {
  hasProjectableSlots,
  projectQualifiers,
} from '../qualifiers.util';

// Orden de octavos -> semifinal usado para ordenar las columnas del cuadro.
const ROUND_ORDER = ['round-of-32', 'round-of-16', 'quarter', 'semi'] as const;

// Etiqueta de día en el idioma y la zona horaria del navegador.
const DAY_FMT = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** Un día con partidos: clave local, inicio del día y sus partidos ordenados. */
interface MatchDay {
  readonly key: string;
  readonly ts: number;
  readonly matches: Match[];
}

@Component({
  selector: 'app-tournament-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    BracketTree,
    ChampionTrophy,
    ThirdPlace,
    StageTimeline,
    GroupStageView,
    GroupResults,
    TodayMatches,
  ],
  templateUrl: './tournament-page.html',
})
export class TournamentPage {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(TournamentService);
  private readonly config = inject(API_CONFIG);

  constructor() {
    // Polling solo para ediciones en vivo; se reinicia al cambiar de edición.
    // Usa reload() (no cambia params) para que el recurso conserve el valor
    // previo durante el fetch: no se vacía ni muestra el loader en cada poll.
    effect((onCleanup) => {
      const { type, year } = this.params();
      if (!this.service.isLive(type, year)) return;
      const id = setInterval(
        () => this.edition.reload(),
        this.config.pollIntervalMs,
      );
      onCleanup(() => clearInterval(id));
    });
  }

  protected readonly params = toSignal(
    this.route.paramMap.pipe(
      map((p) => ({
        type: (p.get('type') ?? 'world-cup') as TournamentType,
        year: Number(p.get('edition') ?? 2026),
      })),
    ),
    { initialValue: { type: 'world-cup' as TournamentType, year: 2026 } },
  );

  protected readonly edition = rxResource<
    Edition,
    { type: TournamentType; year: number; live: boolean }
  >({
    params: () => {
      const { type, year } = this.params();
      return { type, year, live: this.service.isLive(type, year) };
    },
    stream: ({ params }) =>
      params.live
        ? this.service.getLiveEdition(params.type, params.year)
        : this.service.getEdition(params.type, params.year),
  });

  protected readonly isLoading = computed(() => this.edition.isLoading());
  protected readonly error = computed(() => this.edition.error());

  /**
   * Vista reconciliada de la edición. Cada poll trae un objeto nuevo; aquí
   * reutilizamos las referencias de lo que no cambió para que, con OnPush, solo
   * re-rendericen las partes que efectivamente cambiaron (sin parpadeo global).
   * Conserva el valor previo mientras el recurso recarga (value === undefined).
   */
  protected readonly data = linkedSignal<
    Edition | undefined,
    Edition | undefined
  >({
    source: () => this.edition.value(),
    computation: (next, prev) =>
      next ? reconcile(prev?.value, next) : prev?.value,
  });

  /** Lista de ediciones del torneo, para el selector de año. */
  private readonly tournament = rxResource<Tournament, TournamentType>({
    params: () => this.params().type,
    stream: ({ params }) => this.service.getTournament(params),
  });

  protected readonly editions = computed<readonly EditionRef[]>(
    () => this.tournament.value()?.editions ?? [],
  );

  /** Grupos que tienen partidos cargados, para la sección de resultados. */
  protected readonly groupsWithMatches = computed<Group[]>(() =>
    (this.data()?.groups ?? []).filter((g) => (g.matches?.length ?? 0) > 0),
  );

  /** Columnas de la grilla de resultados según la cantidad de grupos. */
  protected readonly groupGridClass = computed(() =>
    groupGridClass(this.groupsWithMatches().length),
  );

  /** Toggle del usuario para previsualizar clasificados proyectados. */
  protected readonly showQualifiers = signal(false);

  protected toggleQualifiers(): void {
    this.showQualifiers.update((v) => !v);
  }

  /** ¿Terminó toda la fase de grupos? (todos los partidos jugados). */
  protected readonly groupStageComplete = computed<boolean>(() => {
    const matches = (this.data()?.groups ?? []).flatMap((g) => g.matches ?? []);
    return matches.length > 0 && matches.every((m) => m.played);
  });

  /**
   * Se puede ofrecer la proyección de clasificados solo en formato cuadro, con
   * grupos y llaves cargadas, mientras la fase de grupos no esté definida del
   * todo y haya al menos un slot que la tabla pueda completar.
   */
  protected readonly canPreviewQualifiers = computed<boolean>(() => {
    if (this.mode() !== 'bracket') return false;
    const ed = this.data();
    if (!ed?.knockout || !ed.groups?.length) return false;
    if (this.groupStageComplete()) return false;
    return hasProjectableSlots(ed.knockout.rounds, ed.groups);
  });

  /**
   * Cuadro completo, con clasificados proyectados aplicados cuando el toggle
   * está activo. Se calcula una sola vez sobre todas las rondas para que la
   * asignación de mejores terceros sea única en ambos lados del cuadro.
   */
  private readonly projectedRounds = computed<readonly KnockoutRound[]>(() => {
    const ed = this.data();
    const rounds = ed?.knockout?.rounds ?? [];
    if (!ed?.groups?.length) return rounds;
    // Fase de grupos terminada: las tablas son definitivas, así que
    // proyectamos todo el cuadro (incl. mejores terceros). La asignación de
    // terceros sigue siendo una aproximación plausible y única, pero ya no
    // cambia, así que conviene mostrarla en vez de dejar los 16avos vacíos.
    // Con el toggle también hacemos la proyección completa.
    if (this.groupStageComplete() || this.showQualifiers()) {
      return projectQualifiers(rounds, ed.groups);
    }
    // Fase en curso sin toggle: solo clasificados definitivos de grupos cerrados.
    return projectQualifiers(rounds, ed.groups, { confirmedOnly: true });
  });

  protected readonly leftRounds = computed<KnockoutRound[]>(() =>
    this.sideRounds('left'),
  );

  protected readonly rightRounds = computed<KnockoutRound[]>(() =>
    this.sideRounds('right'),
  );

  protected readonly finalMatch = computed<Match | undefined>(
    () =>
      this.data()
        ?.knockout?.rounds.find((r) => r.name === 'final')
        ?.matches[0],
  );

  protected readonly thirdPlace = computed<Match | undefined>(
    () => this.data()?.thirdPlace,
  );

  protected readonly champion = computed<Team | undefined>(() => {
    const ed = this.data();
    if (!ed) return undefined;
    return this.findTeam(ed.championTeamId);
  });

  /** ¿La edición actual se sirve en vivo (torneo en curso)? */
  protected readonly live = computed(() => {
    const { type, year } = this.params();
    return this.service.isLive(type, year);
  });

  /**
   * Partidos agrupados por día local del navegador, de cualquier fase. Solo
   * para ediciones en vivo; cada día y sus partidos quedan ordenados por fecha.
   * El polling actualiza `data()` y esto se recalcula con minutos/goles frescos.
   */
  protected readonly matchDays = computed<MatchDay[]>(() => {
    const ed = this.data();
    if (!ed || !this.live()) return [];
    const byDay = new Map<string, MatchDay>();
    for (const m of this.allMatches(ed)) {
      if (!m.kickoff) continue;
      const d = new Date(m.kickoff);
      const key = this.dayKey(d);
      let day = byDay.get(key);
      if (!day) {
        const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        day = { key, ts, matches: [] };
        byDay.set(key, day);
      }
      day.matches.push(m);
    }
    return [...byDay.values()]
      .map((d) => ({
        ...d,
        matches: d.matches.sort(
          (a, b) => Date.parse(a.kickoff!) - Date.parse(b.kickoff!),
        ),
      }))
      .sort((a, b) => a.ts - b.ts);
  });

  /**
   * Índice del día visible. Al recargar (poll) conserva el día elegido por su
   * clave; si no, arranca en hoy, o el próximo día con partidos, o el último.
   */
  protected readonly selectedDayIndex = linkedSignal<MatchDay[], number>({
    source: () => this.matchDays(),
    computation: (days, prev) => {
      if (!days.length) return 0;
      if (prev) {
        const prevKey = prev.source[prev.value]?.key;
        const keep = days.findIndex((d) => d.key === prevKey);
        if (keep >= 0) return keep;
      }
      const todayIdx = days.findIndex((d) => d.key === this.dayKey(new Date()));
      if (todayIdx >= 0) return todayIdx;
      const now = Date.now();
      const upcoming = days.findIndex((d) => d.ts >= now);
      return upcoming >= 0 ? upcoming : days.length - 1;
    },
  });

  protected readonly selectedDay = computed<MatchDay | undefined>(
    () => this.matchDays()[this.selectedDayIndex()],
  );

  protected readonly selectedDayLabel = computed(() => {
    const day = this.selectedDay();
    return day ? DAY_FMT.format(new Date(day.ts)) : '';
  });

  protected readonly hasPrevDay = computed(() => this.selectedDayIndex() > 0);
  protected readonly hasNextDay = computed(
    () => this.selectedDayIndex() < this.matchDays().length - 1,
  );

  protected prevDay(): void {
    if (this.hasPrevDay()) this.selectedDayIndex.update((i) => i - 1);
  }

  protected nextDay(): void {
    if (this.hasNextDay()) this.selectedDayIndex.update((i) => i + 1);
  }

  /** Sólo se muestra el timeline detallado del Mundial 2026. */
  protected readonly showTimeline = computed(() => this.params().year === 2026);

  /**
   * Formato de presentación: 'bracket' (cuadro estándar) o 'groups' (liguilla,
   * para ediciones con `finalRound` como 1950/1974/1978/1982).
   */
  protected readonly mode = computed<'bracket' | 'groups'>(() =>
    this.data()?.finalRound ? 'groups' : 'bracket',
  );

  /**
   * Busca un equipo por id en cualquier parte de la edición (grupos, cuadro,
   * tercer puesto). Necesario para ediciones sin fase de grupos (1934/1938).
   */
  private findTeam(teamId: string): Team | undefined {
    const ed = this.data();
    if (!ed) return undefined;
    const allGroups = [
      ...(ed.groups ?? []),
      ...(ed.finalRound?.groups ?? []),
    ];
    for (const group of allGroups) {
      for (const row of group.standings) {
        if (row.team.id === teamId) return row.team;
      }
    }
    const matches = [
      ...(ed.knockout?.rounds.flatMap((r) => r.matches) ?? []),
      ...(ed.thirdPlace ? [ed.thirdPlace] : []),
    ];
    for (const m of matches) {
      if (m.home.team.id === teamId) return m.home.team;
      if (m.away.team.id === teamId) return m.away.team;
    }
    return undefined;
  }

  /**
   * Todos los partidos de la edición: grupos, liguilla, llaves y 3er puesto.
   * Las llaves se toman ya proyectadas para que el panel de la jornada muestre
   * los países clasificados (y no los placeholders "2º Grupo A") en cuanto la
   * tabla permite resolverlos.
   */
  private allMatches(ed: Edition): Match[] {
    return [
      ...(ed.groups ?? []).flatMap((g) => g.matches ?? []),
      ...(ed.finalRound?.groups ?? []).flatMap((g) => g.matches ?? []),
      ...this.projectedRounds().flatMap((r) => r.matches),
      ...(ed.thirdPlace ? [ed.thirdPlace] : []),
    ];
  }

  /** Clave de día local (año-mes-día) para agrupar partidos por jornada. */
  private dayKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  private sideRounds(side: 'left' | 'right'): KnockoutRound[] {
    return this.projectedRounds()
      .filter((r) => r.side === side)
      .sort(
        (a, b) =>
          ROUND_ORDER.indexOf(a.name as (typeof ROUND_ORDER)[number]) -
          ROUND_ORDER.indexOf(b.name as (typeof ROUND_ORDER)[number]),
      );
  }
}
