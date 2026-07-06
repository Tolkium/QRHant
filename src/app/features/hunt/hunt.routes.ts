import { Routes } from '@angular/router';

export const HUNT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./hunt-shell').then((m) => m.HuntShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'codes' },
      {
        path: 'codes',
        loadComponent: () => import('./codes/codes-page').then((m) => m.CodesPage),
      },
      {
        path: 'codes/:codeId',
        loadComponent: () => import('./codes/card-detail-page').then((m) => m.CardDetailPage),
      },
      {
        path: 'ranking',
        loadComponent: () => import('./ranking/ranking-page').then((m) => m.RankingPage),
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/profile-page').then((m) => m.ProfilePage),
      },
    ],
  },
  {
    path: 'scan',
    loadComponent: () => import('./scan/scan-page').then((m) => m.ScanPage),
  },
];
