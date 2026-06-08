import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'tournaments/world-cup/2026',
  },
  {
    path: 'tournaments/:type/:edition',
    loadComponent: () =>
      import('./features/tournament/tournament-page/tournament-page').then(
        (m) => m.TournamentPage,
      ),
  },
  {
    path: '**',
    redirectTo: 'tournaments/world-cup/2026',
  },
];
