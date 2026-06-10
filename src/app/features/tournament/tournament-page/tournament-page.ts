import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
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
import { GroupPanel } from '../components/group-panel/group-panel';
import { BracketTree } from '../components/bracket-tree/bracket-tree';
import { ChampionTrophy } from '../components/champion-trophy/champion-trophy';
import { ThirdPlace } from '../components/third-place/third-place';
import { StageTimeline } from '../components/stage-timeline/stage-timeline';
import { GroupStageView } from '../components/group-stage-view/group-stage-view';
import { GroupResults } from '../components/group-results/group-results';
import { groupGridClass } from '../group-grid.util';

// Orden de octavos -> semifinal usado para ordenar las columnas del cuadro.
const ROUND_ORDER = ['round-of-32', 'round-of-16', 'quarter', 'semi'] as const;

@Component({
  selector: 'app-tournament-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    GroupPanel,
    BracketTree,
    ChampionTrophy,
    ThirdPlace,
    StageTimeline,
    GroupStageView,
    GroupResults,
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

  /** Grupos de la columna izquierda: A, C, E, G, I, K. */
  protected readonly groupsLeft = computed<Group[]>(() =>
    (this.data()?.groups ?? []).filter((_, i) => i % 2 === 0),
  );

  /** Grupos que tienen partidos cargados, para la sección de resultados. */
  protected readonly groupsWithMatches = computed<Group[]>(() =>
    (this.data()?.groups ?? []).filter((g) => (g.matches?.length ?? 0) > 0),
  );

  /** Columnas de la grilla de resultados según la cantidad de grupos. */
  protected readonly groupGridClass = computed(() =>
    groupGridClass(this.groupsWithMatches().length),
  );

  /** Grupos de la columna derecha: B, D, F, H, J, L. */
  protected readonly groupsRight = computed<Group[]>(() =>
    (this.data()?.groups ?? []).filter((_, i) => i % 2 === 1),
  );

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

  private sideRounds(side: 'left' | 'right'): KnockoutRound[] {
    const rounds = this.data()?.knockout?.rounds ?? [];
    return rounds
      .filter((r) => r.side === side)
      .sort(
        (a, b) =>
          ROUND_ORDER.indexOf(a.name as (typeof ROUND_ORDER)[number]) -
          ROUND_ORDER.indexOf(b.name as (typeof ROUND_ORDER)[number]),
      );
  }
}
