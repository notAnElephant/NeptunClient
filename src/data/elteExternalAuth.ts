export const ELTE_LOGIN_URL = 'https://neptun.elte.hu/Account/Login';

export const ELTE_STUDENT_WEB_HANDOFF_SCRIPT = `(() => {
  const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim().toLocaleLowerCase('hu-HU');
  const link = Array.from(document.querySelectorAll('a')).find((candidate) => normalize(candidate.textContent) === 'hallgatói web');
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'elte-student-web-link', found: Boolean(link) }));
  if (link) {
    link.removeAttribute('target');
    link.click();
  }
  true;
})();`;

const ELTE_STUDENT_HOST_PATTERN = /^hallgato\d+\.neptun\.elte\.hu$/i;
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ElteLoginCallback { guid: string; serviceUrl: string }

export function extractElteLoginCallback(rawUrl: string): ElteLoginCallback | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' || !ELTE_STUDENT_HOST_PATTERN.test(url.hostname) || url.pathname.toLowerCase() !== '/outerlogin') return null;
    const guid = url.searchParams.get('GUID') ?? url.searchParams.get('guid');
    return guid && GUID_PATTERN.test(guid) ? { guid, serviceUrl: `${url.origin}/api` } : null;
  } catch {
    return null;
  }
}

export function validateElteServiceUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' || !ELTE_STUDENT_HOST_PATTERN.test(url.hostname) || url.pathname.replace(/\/$/, '').toLowerCase() !== '/api' || url.search || url.hash) return null;
    return `${url.origin}/api`;
  } catch {
    return null;
  }
}

export function shouldAttemptElteStudentWebHandoff(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' && url.hostname === 'neptun.elte.hu' && url.pathname === '/';
  } catch {
    return false;
  }
}
