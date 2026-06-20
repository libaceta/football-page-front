import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Group } from '../../../../core/models/tournament.model';
import { flagClass } from '../../../../core/utils/flag.util';
import { computeGroupRows } from '../../standings.util';

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
      <table class="w-full table-fixed text-[10px]">
        <thead>
          <tr class="text-zinc-500">
            <th class="w-4 px-1 py-0.5 text-left font-medium">#</th>
            <th class="w-28 px-1 py-0.5 text-left font-medium"></th>
            @if (detailed()) {
              <th></th>
            }
            <th class="w-7 px-1 py-0.5 text-right font-medium">PTS</th>
            @if (detailed()) {
              <th class="w-5 px-0.5 py-0.5 text-right font-medium">J</th>
              <th class="w-8 px-0.5 py-0.5 text-right font-medium">Gol</th>
              <th class="w-6 px-0.5 py-0.5 text-right font-medium">+/-</th>
              <th class="w-4 px-0.5 py-0.5 text-right font-medium">G</th>
              <th class="w-4 px-0.5 py-0.5 text-right font-medium">E</th>
              <th class="w-4 px-0.5 py-0.5 text-right font-medium">P</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.team.id) {
            <tr
              class="border-t border-white/5"
              [class]="row.position <= 2 ? 'text-zinc-100' : 'text-zinc-400'"
            >
              <td class="px-1 py-0.5 text-zinc-500">{{ row.position }}</td>
              <td class="w-28 max-w-28 truncate px-1 py-0.5">
                <span class="mr-1 inline-block align-middle text-[11px]" [class]="flag(row.team.flagCode)"></span>
                <span class="align-middle">{{ row.team.name }}</span>
              </td>
              @if (detailed()) {
                <td class="w-full"></td>
              }
              <td class="px-1 py-0.5 text-right font-semibold tabular-nums">
                {{ row.points }}
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

  // Tabla en vivo recalculada desde los partidos jugados (compartida con la
  // proyección de clasificados al cuadro).
  protected readonly rows = computed(() => computeGroupRows(this.group()));
}
