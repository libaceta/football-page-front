import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import {
  Edition,
  Match,
  Team,
} from '../../../../core/models/tournament.model';
import { groupGridClass } from '../../group-grid.util';
import { GroupPanel } from '../group-panel/group-panel';
import { GroupResults } from '../group-results/group-results';
import { MatchCard } from '../match-card/match-card';
import { ChampionTrophy } from '../champion-trophy/champion-trophy';
import { ThirdPlace } from '../third-place/third-place';

/**
 * Vista para formatos históricos sin cuadro estándar: fase de grupos inicial +
 * una fase de liguilla posterior (`finalRound`) y, opcionalmente, semifinales,
 * final y tercer puesto. Cubre 1950 (ronda final), 1974/1978 (2da fase de
 * grupos + final) y 1982 (2da fase + semis + final).
 */
@Component({
  selector: 'app-group-stage-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GroupPanel, GroupResults, MatchCard, ChampionTrophy, ThirdPlace],
  templateUrl: './group-stage-view.html',
})
export class GroupStageView {
  readonly edition = input.required<Edition>();
  readonly champion = input<Team | undefined>();

  protected readonly firstGroups = computed(() => this.edition().groups ?? []);
  protected readonly firstGroupsGridClass = computed(() =>
    groupGridClass(this.firstGroups().length),
  );
  protected readonly finalRound = computed(() => this.edition().finalRound);

  protected readonly semis = computed<Match[]>(() =>
    (this.edition().knockout?.rounds ?? [])
      .filter((r) => r.name === 'semi')
      .flatMap((r) => r.matches),
  );

  protected readonly finalMatch = computed<Match | undefined>(
    () =>
      this.edition()
        .knockout?.rounds.find((r) => r.name === 'final')
        ?.matches[0],
  );

  protected readonly thirdPlace = computed<Match | undefined>(
    () => this.edition().thirdPlace,
  );
}
