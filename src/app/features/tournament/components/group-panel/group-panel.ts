import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Group } from '../../../../core/models/tournament.model';
import { flagClass } from '../../../../core/utils/flag.util';

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
      <table class="w-full text-[10px]">
        <thead>
          <tr class="text-zinc-500">
            <th class="w-4 px-1 py-0.5 text-left font-medium">#</th>
            <th class="px-1 py-0.5 text-left font-medium"></th>
            <th class="w-6 px-1 py-0.5 text-right font-medium">PTS</th>
          </tr>
        </thead>
        <tbody>
          @for (row of group().standings; track row.team.id) {
            <tr
              class="border-t border-white/5"
              [class]="row.position <= 2 ? 'text-zinc-100' : 'text-zinc-400'"
            >
              <td class="px-1 py-0.5 text-zinc-500">{{ row.position }}</td>
              <td class="px-1 py-0.5">
                <span class="mr-1 inline-block align-middle text-[11px]" [class]="flag(row.team.flagCode)"></span>
                <span class="align-middle">{{ row.team.name }}</span>
              </td>
              <td class="px-1 py-0.5 text-right font-semibold tabular-nums">
                {{ row.points }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class GroupPanel {
  readonly group = input.required<Group>();
  protected readonly flag = flagClass;
}
