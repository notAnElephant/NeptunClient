import { beforeEach, describe, expect, it } from 'vitest';
import type { Session } from '@/domain/models';
import { loadSecureSession, saveSecureSession } from './secureSession.web';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const session: Session = { institutionId: 'FI23344', provider: 'modern', userName: 'ABC123', accessToken: 'token' };

describe('web remembered session', () => {
  beforeEach(() => { Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: new MemoryStorage() }); });

  it('stores opted-in credentials for the current browser tab', async () => {
    await saveSecureSession(session, { userName: 'ABC123', password: 'secret', accessToken: 'token', rememberMe: true });
    await expect(loadSecureSession()).resolves.toEqual({ session, secret: { userName: 'ABC123', password: 'secret', accessToken: 'token', rememberMe: true } });
  });

  it('does not persist a session when remembering is disabled', async () => {
    await saveSecureSession(session, { userName: 'ABC123', password: 'secret', rememberMe: false });
    await expect(loadSecureSession()).resolves.toBeNull();
  });

  it('removes sessions written before explicit opt-in existed', async () => {
    sessionStorage.setItem('neptun.session.v1', JSON.stringify(session));
    sessionStorage.setItem('neptun.secret.v1', JSON.stringify({ userName: 'ABC123', accessToken: 'token' }));
    await expect(loadSecureSession()).resolves.toBeNull();
    expect(sessionStorage.getItem('neptun.secret.v1')).toBeNull();
  });
});
