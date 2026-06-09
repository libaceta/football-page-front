import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Match, MatchSlot } from '../../../../core/models/tournament.model';
import { flagClass } from '../../../../core/utils/flag.util';

type Outcome = 'home' | 'away' | 'none';

// Fecha y hora en la zona horaria y el idioma del navegador.
const DATE_FMT = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

interface SlotView {
  readonly kind: 'home' | 'away';
  readonly slot: MatchSlot;
  readonly winner: boolean;
}

@Component({
  selector: 'app-match-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="w-full min-w-[8.5rem] overflow-hidden rounded-md border border-white/10 bg-[#15151d] text-[11px] shadow-sm"
    >
      @if (when()) {
        <div class="bg-black/20 px-2 py-0.5 text-center text-[8px] uppercase tracking-wide text-zinc-500">
          {{ when() }}
        </div>
      }
      @for (s of slots(); track s.kind) {
        <div
          class="flex items-center gap-1.5 px-2 py-1 leading-none"
          [class]="
            s.winner
              ? 'bg-amber-400/10 text-amber-200 font-semibold'
              : 'text-zinc-300'
          "
        >
          <span class="shrink-0 text-sm" [class]="flag(s.slot.team.flagCode)"></span>
          <span class="flex-1 truncate">{{ s.slot.team.name }}</span>
          @if (s.slot.penalties != null) {
            <span class="text-[9px] text-zinc-500">({{ s.slot.penalties }})</span>
          }
          <span class="tabular-nums text-zinc-100">{{ s.slot.score ?? '-' }}</span>
        </div>
      }
    </div>
  `,
})
export class MatchCard {
  readonly match = input.required<Match>();

  protected readonly flag = flagClass;

  protected readonly when = computed<string>(() => {
    const k = this.match().kickoff;
    return k ? DATE_FMT.format(new Date(k)) : '';
  });

  private readonly outcome = computed<Outcome>(() => {
    const m = this.match();
    if (!m.played || m.home.score == null || m.away.score == null) {
      return 'none';
    }
    if (m.home.score > m.away.score) return 'home';
    if (m.away.score > m.home.score) return 'away';
    // Empate en tiempo reglamentario: desempata por penales si los hay.
    if (m.home.penalties != null && m.away.penalties != null) {
      if (m.home.penalties > m.away.penalties) return 'home';
      if (m.away.penalties > m.home.penalties) return 'away';
    }
    return 'none';
  });

  protected readonly slots = computed<SlotView[]>(() => {
    const m = this.match();
    const o = this.outcome();
    return [
      { kind: 'home', slot: m.home, winner: o === 'home' },
      { kind: 'away', slot: m.away, winner: o === 'away' },
    ];
  });
}
