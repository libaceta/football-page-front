import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import {
  BracketSide,
  KnockoutRound,
} from '../../../../core/models/tournament.model';
import { MatchCard } from '../match-card/match-card';

const ROUND_LABEL: Record<string, string> = {
  'round-of-32': 'DIECISEISAVOS',
  'round-of-16': 'OCTAVOS DE FINAL',
  quarter: 'CUARTOS DE FINAL',
  semi: 'SEMIFINAL',
  final: 'FINAL',
};

/**
 * Renderiza un lado del cuadro de eliminatorias como columnas de rondas.
 * `rounds` debe venir ordenado de afuera (dieciseisavos) hacia adentro
 * (semifinal). Cada partido se envuelve en un slot de igual altura (flex:1),
 * de modo que la card de la ronda siguiente queda centrada exactamente entre
 * las dos cards que la alimentan. Las líneas conectoras se dibujan por CSS.
 *
 * En el lado derecho las columnas se invierten y los conectores se reflejan
 * para que el árbol crezca hacia el centro, igual que en el mockup.
 */
@Component({
  selector: 'app-bracket-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatchCard],
  templateUrl: './bracket-tree.html',
  styleUrl: './bracket-tree.scss',
})
export class BracketTree {
  readonly rounds = input.required<readonly KnockoutRound[]>();
  readonly side = input.required<BracketSide>();

  protected readonly label = (name: string): string =>
    ROUND_LABEL[name] ?? name.toUpperCase();
}
