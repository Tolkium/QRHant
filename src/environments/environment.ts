export const environment = {
  /** 'mock' runs entirely on-device (alpha). 'supabase' uses the real backend. */
  backend: 'mock' as 'mock' | 'supabase',
  appVersion: '0.1.0',
  /** Leave empty to disable Sentry (e.g. local development). */
  sentryDsn: '',
  supabaseUrl: '',
  supabaseAnonKey: '',
};
