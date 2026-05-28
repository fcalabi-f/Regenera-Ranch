// Persistencia del "campo activo" del usuario en una cookie.
// Lectura desde server o cliente; escritura solo desde cliente (esta página recarga).

const COOKIE_NAME = 'rr_active_campo';
const MAX_AGE = 60 * 60 * 24 * 365; // 1 año

export function setActiveCampoCookie(campoId: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(campoId)}; path=/; max-age=${MAX_AGE}; samesite=lax`;
}

export function getActiveCampoCookieClient(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

export async function getActiveCampoCookieServer(): Promise<string | null> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}
