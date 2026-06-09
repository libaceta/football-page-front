import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Match, Team } from '../../../../core/models/tournament.model';
import { flagClass } from '../../../../core/utils/flag.util';

// Fecha y hora en la zona horaria y el idioma del navegador.
const DATE_FMT = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

@Component({
  selector: 'app-champion-trophy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center gap-2 text-center">
      <div class="text-4xl drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]">🏆</div>

      @if (final(); as f) {
        <div class="text-[9px] font-bold tracking-[0.2em] text-zinc-500">FINAL</div>
        @if (when()) {
          <div class="text-[8px] uppercase tracking-wide text-zinc-500">{{ when() }}</div>
        }
      }

      @if (final(); as f) {
        <div
          class="flex items-center gap-3 rounded-lg border border-amber-400/30 bg-[#15151d] px-4 py-2"
        >
          <div class="flex flex-col items-center gap-0.5">
            <span class="text-xl" [class]="flag(f.home.team.flagCode)"></span>
            <span class="text-[10px] text-zinc-300">{{ f.home.team.name }}</span>
          </div>
          <div class="flex flex-col items-center">
            <div class="text-lg font-bold tabular-nums text-amber-200">
              {{ f.home.score }} - {{ f.away.score }}
            </div>
            @if (f.home.penalties != null && f.away.penalties != null) {
              <div class="text-[9px] text-zinc-500">
                ({{ f.home.penalties }}-{{ f.away.penalties }} pen.)
              </div>
            }
          </div>
          <div class="flex flex-col items-center gap-0.5">
            <span class="text-xl" [class]="flag(f.away.team.flagCode)"></span>
            <span class="text-[10px] text-zinc-300">{{ f.away.team.name }}</span>
          </div>
        </div>
      }

      @if (champion(); as c) {
        <div class="mt-1 flex flex-col items-center">
          <span class="text-[9px] font-bold tracking-[0.2em] text-amber-300"
            >CAMPEÓN</span
          >
          <div class="flex items-center gap-2">
            <span class="text-2xl" [class]="flag(c.flagCode)"></span>
            <span class="text-xl font-extrabold uppercase tracking-wide text-amber-100">
              {{ c.name }}
            </span>
          </div>
        </div>
      }
    </div>
  `,
})
export class ChampionTrophy {
  readonly final = input<Match | undefined>();
  readonly champion = input<Team | undefined>();
  protected readonly flag = flagClass;

  protected readonly when = computed<string>(() => {
    const k = this.final()?.kickoff;
    return k ? DATE_FMT.format(new Date(k)) : '';
  });
}
