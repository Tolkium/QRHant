import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTransloco } from '@jsverse/transloco';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { TranslocoHttpLoader } from './core/i18n/transloco.loader';
import { AdminApi, AuthApi, CodesApi, FindsApi, LeaderboardApi } from './core/backend/api';
import {
  MockAdminApi,
  MockAuthApi,
  MockCodesApi,
  MockFindsApi,
  MockLeaderboardApi,
} from './core/backend/mock/mock-backend';
import {
  SupabaseAdminApi,
  SupabaseAuthApi,
  SupabaseCodesApi,
  SupabaseFindsApi,
  SupabaseLeaderboardApi,
} from './core/backend/supabase/supabase-backend';
import { SessionStore } from './core/stores/session.store';
import { PackStore } from './core/stores/pack.store';
import { FindsStore } from './core/stores/finds.store';
import { SyncEngine } from './core/sync/sync-engine';
import { LANGS, Lang } from './core/models';

function initialLang(): Lang {
  const saved = localStorage.getItem('qrhunt.lang');
  if (saved && (LANGS as string[]).includes(saved)) return saved as Lang;
  const nav = navigator.language.slice(0, 2).toLowerCase();
  return (LANGS as string[]).includes(nav) ? (nav as Lang) : 'en';
}

/**
 * The backend swap point: bind the abstract APIs to mock (alpha, on-device)
 * or supabase (production). Switch via environment.backend.
 */
const backendProviders =
  environment.backend === 'mock'
    ? [
        { provide: AuthApi, useClass: MockAuthApi },
        { provide: CodesApi, useClass: MockCodesApi },
        { provide: FindsApi, useClass: MockFindsApi },
        { provide: LeaderboardApi, useClass: MockLeaderboardApi },
        { provide: AdminApi, useClass: MockAdminApi },
      ]
    : [
        { provide: AuthApi, useClass: SupabaseAuthApi },
        { provide: CodesApi, useClass: SupabaseCodesApi },
        { provide: FindsApi, useClass: SupabaseFindsApi },
        { provide: LeaderboardApi, useClass: SupabaseLeaderboardApi },
        { provide: AdminApi, useClass: SupabaseAdminApi },
      ];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes, withComponentInputBinding()),
    provideTransloco({
      config: {
        availableLangs: [...LANGS],
        defaultLang: initialLang(),
        fallbackLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    ...backendProviders,
    provideAppInitializer(async () => {
      const session = inject(SessionStore);
      const pack = inject(PackStore);
      const finds = inject(FindsStore);
      const sync = inject(SyncEngine);
      await session.restore();
      // Never gate the shell on the network: load() serves cache first.
      await pack.load();
      await finds.load();
      sync.start();
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
