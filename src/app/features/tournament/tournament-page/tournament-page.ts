import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { TournamentService } from '../../../core/services/tournament.service';
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
  ],
  templateUrl: './tournament-page.html',
})
export class TournamentPage {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(TournamentService);

  protected readonly params = toSignal(
    this.route.paramMap.pipe(
      map((p) => ({
        type: (p.get('type') ?? 'world-cup') as TournamentType,
        year: Number(p.get('edition') ?? 2026),
      })),
    ),
    { initialValue: { type: 'world-cup' as TournamentType, year: 2026 } },
  );

  protected readonly edition = rxResource<Edition, { type: TournamentType; year: number }>({
    params: () => this.params(),
    stream: ({ params }) => this.service.getEdition(params.type, params.year),
  });

  protected readonly isLoading = computed(() => this.edition.isLoading());
  protected readonly error = computed(() => this.edition.error());
  protected readonly data = computed(() => this.edition.value());

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
    for (const group of ed.groups ?? []) {
      for (const row of group.standings) {
        if (row.team.id === ed.championTeamId) return row.team;
      }
    }
    return undefined;
  });

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
