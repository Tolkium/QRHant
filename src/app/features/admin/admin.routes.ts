import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-shell').then((m) => m.AdminShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'events',
        loadComponent: () => import('./pages/events-page').then((m) => m.EventsPage),
      },
      {
        path: 'codes',
        loadComponent: () => import('./pages/admin-codes-page').then((m) => m.AdminCodesPage),
      },
      {
        path: 'map',
        loadComponent: () => import('./pages/map-page').then((m) => m.MapPage),
      },
      {
        path: 'leaderboard',
        loadComponent: () =>
          import('./pages/leaderboard-controls-page').then((m) => m.LeaderboardControlsPage),
      },
      {
        path: 'players',
        loadComponent: () => import('./pages/players-page').then((m) => m.PlayersPage),
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings-page').then((m) => m.SettingsPage),
      },
    ],
  },
  {
    path: 'print',
    loadComponent: () => import('./pages/print-page').then((m) => m.PrintPage),
  },
  {
    path: 'map-print',
    loadComponent: () => import('./pages/map-print-page').then((m) => m.MapPrintPage),
  },
];
