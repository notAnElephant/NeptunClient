export const ELTE_LOGIN_URL = 'https://neptun.elte.hu/Account/Login';

const ELTE_CALLBACK_HOST = 'hallgato2.neptun.elte.hu';
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function extractElteLoginGuid(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' || url.hostname !== ELTE_CALLBACK_HOST || url.pathname.toLowerCase() !== '/outerlogin') return null;
    const guid = url.searchParams.get('GUID') ?? url.searchParams.get('guid');
    return guid && GUID_PATTERN.test(guid) ? guid : null;
  } catch {
    return null;
  }
}
