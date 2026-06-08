import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Stage {
  readonly label: string;
  readonly detail: string;
}

@Component({
  selector: 'app-stage-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-lg border border-white/10 bg-[#101018] px-4 py-3"
    >
      @for (stage of stages; track stage.label; let last = $last) {
        <div class="flex items-center gap-2">
          <div class="text-center">
            <div class="text-[10px] font-bold tracking-wider text-amber-300">
              {{ stage.label }}
            </div>
            <div class="text-[9px] text-zinc-500">{{ stage.detail }}</div>
          </div>
          @if (!last) {
            <span class="text-zinc-600">→</span>
          }
        </div>
      }
    </div>
  `,
})
export class StageTimeline {
  protected readonly stages: readonly Stage[] = [
    { label: 'FASE DE GRUPOS', detail: '11 JUN – 27 JUN · 72 partidos' },
    { label: 'DIECISEISAVOS', detail: '28 JUN – 3 JUL · 16 partidos' },
    { label: 'OCTAVOS DE FINAL', detail: '4 JUL – 7 JUL · 8 partidos' },
    { label: 'CUARTOS DE FINAL', detail: '9 JUL – 11 JUL · 4 partidos' },
    { label: 'SEMIFINALES', detail: '14 JUL – 15 JUL · 2 partidos' },
    { label: 'FINAL', detail: '19 JUL · 1 partido' },
  ];
}
