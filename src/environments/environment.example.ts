/** Copy to environment.local.ts (gitignored) when testing Supabase locally. */
export const environment = {
  backend: 'supabase' as 'mock' | 'supabase',
  appVersion: '0.1.0',
  sentryDsn: '',
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'sb_publishable_...', // or legacy anon eyJ… if still enabled
};
