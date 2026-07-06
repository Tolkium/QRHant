/** Copy to environment.local.ts (gitignored) when testing Supabase locally. */
export const environment = {
  backend: 'mock' as 'mock' | 'supabase',
  appVersion: '0.1.0',
  sentryDsn: '',
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_ANON_KEY',
};
