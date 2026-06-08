import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Group, Match } from '../../../../core/models/tournament.model';
import { flagClass } from '../../../../core/utils/flag.util';
import { GroupPanel } from '../group-panel/group-panel';

type Win = 'home' | 'away' | 'draw';

interface MatchRow {
  readonly match: Match;
  readonly outcome: Win;
}

/**
 * Repite la tabla de posiciones de un grupo y, debajo, lista cada partido de
 * la fase de grupos con su resultado.
 */
@Component({
  selector: 'app-group-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GroupPanel],
  template: `
    <div class="flex flex-col gap-1.5">
      <app-group-panel [group]="group()" [detailed]="true" />

      @if (rows().length) {
        <div class="rounded-md border border-white/10 bg-[#101018] p-1.5">
          <div
            class="mb-1 px-1 text-[9px] font-bold tracking-wider text-zinc-500"
          >
            PARTIDOS
          </div>
          <ul class="flex flex-col gap-0.5">
            @for (r of rows(); track r.match.id) {
              <li
                class="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-none"
              >
                <span
                  class="flex flex-1 items-center justify-end gap-1 truncate text-right"
                  [class]="r.outcome === 'home' ? 'text-zinc-100 font-semibold' : 'text-zinc-400'"
                >
                  <span class="truncate">{{ r.match.home.team.name }}</span>
                  <span class="shrink-0 text-[11px]" [class]="flag(r.match.home.team.flagCode)"></span>
                </span>
                <span class="shrink-0 px-1 tabular-nums text-zinc-200">
                  {{ r.match.home.score }}-{{ r.match.away.score }}
                </span>
                <span
                  class="flex flex-1 items-center gap-1 truncate"
                  [class]="r.outcome === 'away' ? 'text-zinc-100 font-semibold' : 'text-zinc-400'"
                >
                  <span class="shrink-0 text-[11px]" [class]="flag(r.match.away.team.flagCode)"></span>
                  <span class="truncate">{{ r.match.away.team.name }}</span>
                </span>
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
})
export class GroupResults {
  readonly group = input.required<Group>();

  protected readonly flag = flagClass;

  protected readonly rows = computed<MatchRow[]>(() =>
    (this.group().matches ?? []).map((m) => ({
      match: m,
      outcome:
        (m.home.score ?? 0) > (m.away.score ?? 0)
          ? 'home'
          : (m.away.score ?? 0) > (m.home.score ?? 0)
            ? 'away'
            : 'draw',
    })),
  );
}
