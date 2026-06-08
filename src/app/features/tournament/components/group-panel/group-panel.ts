import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Group, GroupStanding } from '../../../../core/models/tournament.model';
import { flagClass } from '../../../../core/utils/flag.util';

interface StatRow {
  readonly standing: GroupStanding;
  /** Partidos jugados. */
  readonly j: number;
  readonly gf: number;
  readonly ga: number;
  /** Diferencia de goles. */
  readonly gd: number;
  readonly w: number;
  readonly d: number;
  readonly l: number;
}

@Component({
  selector: 'app-group-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-md border border-white/10 bg-[#101018]">
      <div
        class="border-b border-white/10 px-2 py-1 text-[10px] font-bold tracking-wider text-amber-300"
      >
        {{ group().name }}
      </div>
      <table class="text-[10px]">
        <thead>
          <tr class="text-zinc-500">
            <th class="w-4 px-1 py-0.5 text-left font-medium">#</th>
            <th class="px-1 py-0.5 text-left font-medium"></th>
            <th class="w-6 px-1 py-0.5 text-right font-medium">PTS</th>
            @if (detailed()) {
              <th class="w-5 px-0.5 py-0.5 text-right font-medium">J</th>
              <th class="w-9 px-0.5 py-0.5 text-right font-medium">Gol</th>
              <th class="w-6 px-0.5 py-0.5 text-right font-medium">+/-</th>
              <th class="w-5 px-0.5 py-0.5 text-right font-medium">G</th>
              <th class="w-5 px-0.5 py-0.5 text-right font-medium">E</th>
              <th class="w-5 px-0.5 py-0.5 text-right font-medium">P</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.standing.team.id) {
            <tr
              class="border-t border-white/5"
              [class]="row.standing.position <= 2 ? 'text-zinc-100' : 'text-zinc-400'"
            >
              <td class="px-1 py-0.5 text-zinc-500">{{ row.standing.position }}</td>
              <td class="px-1 py-0.5">
                <span class="mr-1 inline-block align-middle text-[11px]" [class]="flag(row.standing.team.flagCode)"></span>
                <span class="align-middle">{{ row.standing.team.name }}</span>
              </td>
              <td class="px-1 py-0.5 text-right font-semibold tabular-nums">
                {{ row.standing.points }}
              </td>
              @if (detailed()) {
                <td class="px-0.5 py-0.5 text-right tabular-nums text-zinc-400">{{ row.j }}</td>
                <td class="px-0.5 py-0.5 text-right tabular-nums text-zinc-400">{{ row.gf }}:{{ row.ga }}</td>
                <td class="px-0.5 py-0.5 text-right tabular-nums text-zinc-400">{{ row.gd > 0 ? '+' : '' }}{{ row.gd }}</td>
                <td class="px-0.5 py-0.5 text-right tabular-nums text-zinc-400">{{ row.w }}</td>
                <td class="px-0.5 py-0.5 text-right tabular-nums text-zinc-400">{{ row.d }}</td>
                <td class="px-0.5 py-0.5 text-right tabular-nums text-zinc-400">{{ row.l }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class GroupPanel {
  readonly group = input.required<Group>();
  /** Muestra columnas extra (J, goles, dif, G/E/P) calculadas de los partidos. */
  readonly detailed = input(false);

  protected readonly flag = flagClass;

  protected readonly rows = computed<StatRow[]>(() => {
    const g = this.group();
    const acc = new Map<
      string,
      { j: number; gf: number; ga: number; w: number; d: number; l: number }
    >();
    for (const s of g.standings) {
      acc.set(s.team.id, { j: 0, gf: 0, ga: 0, w: 0, d: 0, l: 0 });
    }
    for (const m of g.matches ?? []) {
      if (!m.played || m.home.score == null || m.away.score == null) continue;
      const h = acc.get(m.home.team.id);
      const a = acc.get(m.away.team.id);
      if (!h || !a) continue;
      const hs = m.home.score;
      const as = m.away.score;
      h.j++; a.j++;
      h.gf += hs; h.ga += as;
      a.gf += as; a.ga += hs;
      if (hs > as) { h.w++; a.l++; }
      else if (as > hs) { a.w++; h.l++; }
      else { h.d++; a.d++; }
    }
    return g.standings.map((s) => {
      const t = acc.get(s.team.id)!;
      return { standing: s, j: t.j, gf: t.gf, ga: t.ga, gd: t.gf - t.ga, w: t.w, d: t.d, l: t.l };
    });
  });
}
