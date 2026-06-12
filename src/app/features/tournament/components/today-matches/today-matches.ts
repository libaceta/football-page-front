import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import { Match } from '../../../../core/models/tournament.model';
import { flagClass } from '../../../../core/utils/flag.util';

type Win = 'home' | 'away' | 'draw';

interface MatchRow {
  readonly match: Match;
  readonly outcome: Win;
  /** Etiqueta de estado: minuto en vivo / FINAL / fecha-hora. `null` si no hay. */
  readonly badge: { text: string; live: boolean } | null;
}

// Hora en el idioma y la zona horaria del navegador.
const TIME_FMT = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Partidos de una jornada del torneo en curso, uno debajo del otro con los dos
 * equipos en la misma fila (como la fase de grupos). Cada fila muestra minuto y
 * goles si está en vivo, o fecha/hora si todavía no empezó. Los botones
 * `‹ Fecha ›` navegan entre días.
 */
@Component({
  selector: 'app-today-matches',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rounded-lg border border-white/10 bg-[#101018] p-3">
      <div class="mb-3 flex items-center justify-center gap-3">
        <button
          type="button"
          (click)="prev.emit()"
          [disabled]="!hasPrev()"
          aria-label="Día anterior"
          class="flex size-7 items-center justify-center rounded-md border border-white/10 bg-[#15151d] text-zinc-300 transition-colors hover:border-white/25 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ‹
        </button>
        <div class="flex flex-col items-center">
          @if (anyLive()) {
            <span
              class="flex items-center gap-1 text-[9px] font-bold tracking-wide text-red-400"
            >
              <span class="size-1.5 animate-pulse rounded-full bg-red-500"></span>
              EN VIVO
            </span>
          }
          <span
            class="text-sm font-bold uppercase tracking-[0.15em] text-amber-300"
          >
            {{ label() }}
          </span>
        </div>
        <button
          type="button"
          (click)="next.emit()"
          [disabled]="!hasNext()"
          aria-label="Día siguiente"
          class="flex size-7 items-center justify-center rounded-md border border-white/10 bg-[#15151d] text-zinc-300 transition-colors hover:border-white/25 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <ul class="mx-auto flex max-w-md flex-col gap-1">
        @for (r of rows(); track r.match.id) {
          <li
            class="flex flex-col gap-0.5 rounded px-1.5 py-1"
            [class]="r.badge?.live ? 'bg-red-500/15 ring-1 ring-red-500/40' : 'bg-[#15151d]'"
          >
            @if (r.badge; as b) {
              <span
                class="flex items-center justify-center gap-1 text-[8px] uppercase tracking-wide"
                [class]="b.live ? 'font-bold text-red-400' : 'text-zinc-500'"
              >
                @if (b.live) {
                  <span class="size-1 shrink-0 animate-pulse rounded-full bg-red-500"></span>
                }
                <span>{{ b.text }}</span>
              </span>
            }
            <div class="flex items-center gap-1 text-[11px] leading-none">
              <span
                class="flex flex-1 items-center justify-end gap-1 truncate text-right"
                [class]="r.outcome === 'home' ? 'font-semibold text-zinc-100' : 'text-zinc-400'"
              >
                <span class="truncate">{{ r.match.home.team.name }}</span>
                <span class="shrink-0 text-xs" [class]="flag(r.match.home.team.flagCode)"></span>
              </span>
              <span class="shrink-0 px-1.5 tabular-nums text-zinc-200">
                {{ score(r.match.home.score) }}-{{ score(r.match.away.score) }}
              </span>
              <span
                class="flex flex-1 items-center gap-1 truncate"
                [class]="r.outcome === 'away' ? 'font-semibold text-zinc-100' : 'text-zinc-400'"
              >
                <span class="shrink-0 text-xs" [class]="flag(r.match.away.team.flagCode)"></span>
                <span class="truncate">{{ r.match.away.team.name }}</span>
              </span>
            </div>
          </li>
        }
      </ul>
    </section>
  `,
})
export class TodayMatches {
  readonly matches = input.required<readonly Match[]>();
  readonly label = input.required<string>();
  readonly hasPrev = input.required<boolean>();
  readonly hasNext = input.required<boolean>();

  readonly prev = output<void>();
  readonly next = output<void>();

  protected readonly flag = flagClass;

  /** Hay al menos un partido en curso (en juego o entretiempo). */
  protected readonly anyLive = computed(() =>
    this.matches().some((m) => m.status === 'live' || m.status === 'paused'),
  );

  protected readonly rows = computed<MatchRow[]>(() =>
    this.matches().map((m) => ({
      match: m,
      outcome: this.outcome(m),
      badge: this.badge(m),
    })),
  );

  /** Marcador o `-` cuando el partido aún no tiene goles cargados. */
  protected score(value: number | undefined): string {
    return value == null ? '-' : String(value);
  }

  private outcome(m: Match): Win {
    if (!m.played || m.home.score == null || m.away.score == null) return 'draw';
    const h = m.home.score;
    const a = m.away.score;
    return h > a ? 'home' : a > h ? 'away' : 'draw';
  }

  private badge(m: Match): { text: string; live: boolean } | null {
    if (m.status === 'live') {
      const t = m.clock ?? (m.minute != null ? `${m.minute}'` : null);
      return { text: t ?? 'EN VIVO', live: true };
    }
    if (m.status === 'paused') return { text: 'ENTRETIEMPO', live: true };
    if (m.status === 'finished') return { text: 'FINAL', live: false };
    return m.kickoff
      ? { text: TIME_FMT.format(new Date(m.kickoff)), live: false }
      : null;
  }
}
