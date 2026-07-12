const AUTH_ERROR_KEYS: Record<string, string> = {
  required: 'auth.errors.required',
  'short-password': 'auth.errors.shortPassword',
  'nickname-taken': 'auth.errors.nicknameTaken',
  invalid: 'auth.errors.invalid',
  banned: 'auth.errors.banned',
  'profile-missing': 'auth.errors.profileMissing',
  'mfa-required': 'auth.errors.mfaRequired',
  'register-failed': 'auth.errors.registerFailed',
  'login-failed': 'auth.errors.loginFailed',
};

export function authErrorKey(
  error: unknown,
  mode: 'login' | 'register',
): string {
  const code = error instanceof Error ? error.message : 'unknown';
  const mapped = AUTH_ERROR_KEYS[code];
  if (mapped) return mapped;
  if (mode === 'register') return 'auth.errors.registerFailed';
  return 'auth.errors.loginFailed';
}

/** Expected user-facing failures — no need to spam the dev console. */
export function isExpectedAuthError(error: unknown): boolean {
  const code = error instanceof Error ? error.message : '';
  return code in AUTH_ERROR_KEYS;
}
