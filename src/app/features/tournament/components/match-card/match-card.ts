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
      class="w-full min-w-[8.5rem] overflow-hidden rounded-md border text-[11px] shadow-sm"
      [class]="
        isLive()
          ? 'border-red-500/60 bg-red-500/10 ring-1 ring-red-500/40'
          : 'border-white/10 bg-[#15151d]'
      "
    >
      @if (badge(); as b) {
        <div
          class="flex items-center justify-center gap-1 bg-black/20 px-2 py-0.5 text-[8px] uppercase tracking-wide"
          [class]="b.live ? 'font-bold text-red-400' : 'text-zinc-500'"
        >
          @if (b.live) {
            <span class="size-1 shrink-0 animate-pulse rounded-full bg-red-500"></span>
          }
          <span>{{ b.text }}</span>
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

  /** Partido en curso (en juego o entretiempo): se resalta con fondo rojo. */
  protected readonly isLive = computed<boolean>(() => {
    const s = this.match().status;
    return s === 'live' || s === 'paused';
  });

  /**
   * Texto de estado del partido: minuto en vivo (`34'`), `ENTRETIEMPO`, `FINAL`
   * o, si aún no empezó, la fecha/hora de inicio. `live` marca los estados en
   * curso para resaltarlos en rojo.
   */
  protected readonly badge = computed<{ text: string; live: boolean } | null>(() => {
    const m = this.match();
    if (m.status === 'live') {
      return { text: m.minute != null ? `${m.minute}'` : 'EN VIVO', live: true };
    }
    if (m.status === 'paused') return { text: 'ENTRETIEMPO', live: true };
    // FINAL solo para datos en vivo (status del backend). Los históricos no
    // traen status => muestran fecha/hora aunque estén jugados.
    if (m.status === 'finished') return { text: 'FINAL', live: false };
    return m.kickoff
      ? { text: DATE_FMT.format(new Date(m.kickoff)), live: false }
      : null;
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
