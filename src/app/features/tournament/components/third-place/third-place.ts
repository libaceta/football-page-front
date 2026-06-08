import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Match } from '../../../../core/models/tournament.model';
import { MatchCard } from '../match-card/match-card';

@Component({
  selector: 'app-third-place',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatchCard],
  template: `
    <div class="flex flex-col items-center gap-1">
      <div class="text-[9px] font-bold tracking-[0.2em] text-zinc-400">
        TERCER PUESTO
      </div>
      <app-match-card [match]="match()" />
    </div>
  `,
})
export class ThirdPlace {
  readonly match = input.required<Match>();
}
