import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Group, Match } from '../../../../core/models/tournament.model';
import { flagClass } from '../../../../core/utils/flag.util';
import { GroupPanel } from '../group-panel/group-panel';

type Win = 'home' | 'away' | 'draw';

interface MatchRow {
  readonly match: Match;
  readonly outcome: Win;
  /** Etiqueta de estado: minuto en vivo / FINAL / fecha-hora. `null` si no hay. */
  readonly badge: { text: string; live: boolean } | null;
  readonly ts: number;
}

// Formato en la zona horaria y el idioma del navegador.
const DATE_FMT = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Repite la tabla de posiciones de un grupo y, debajo, lista cada partido de
 * la fase de grupos con su fecha/hora (en la zona horaria del navegador) y su
 * resultado, ordenados de menor a mayor fecha.
 */
@Component({
  selector: 'app-group-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GroupPanel],
  template: `
    <div class="mx-auto flex w-full max-w-sm flex-col gap-1.5">
      <app-group-panel [group]="group()" [detailed]="true" />

      @if (rows().length) {
        <div class="rounded-md border border-white/10 bg-[#101018] p-1.5">
          <div
            class="mb-1 px-1 text-[9px] font-bold tracking-wider text-zinc-500"
          >
            PARTIDOS
          </div>
          <ul class="flex flex-col gap-1">
            @for (r of rows(); track r.match.id) {
              <li
                class="flex flex-col gap-0.5 rounded px-1 py-0.5"
                [class]="r.badge?.live ? 'bg-red-500/15 ring-1 ring-red-500/40' : ''"
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
                <div class="flex items-center gap-1 text-[10px] leading-none">
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
                </div>
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
    (this.group().matches ?? [])
      .map((m) => {
        const ts = m.kickoff ? Date.parse(m.kickoff) : Number.POSITIVE_INFINITY;
        return {
          match: m,
          outcome: this.outcome(m),
          badge: this.badge(m),
          ts,
        };
      })
      .sort((a, b) => a.ts - b.ts),
  );

  private outcome(m: Match): Win {
    const h = m.home.score ?? 0;
    const a = m.away.score ?? 0;
    return h > a ? 'home' : a > h ? 'away' : 'draw';
  }

  private badge(m: Match): { text: string; live: boolean } | null {
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
  }
}
