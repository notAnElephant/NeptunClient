import { beforeEach, describe, expect, it } from 'vitest';
import { getPreferredNickname, setPreferredNickname } from './preferences.web';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('web nickname preference', () => {
  beforeEach(() => { Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: new MemoryStorage() }); });

  it('stores a trimmed nickname per account', async () => {
    await setPreferredNickname('institution:user', '  Béci  ');
    await expect(getPreferredNickname('institution:user')).resolves.toBe('Béci');
    await expect(getPreferredNickname('institution:other')).resolves.toBeNull();
  });

  it('removes the preference when resetting to the default', async () => {
    await setPreferredNickname('institution:user', 'Béci');
    await setPreferredNickname('institution:user', null);
    await expect(getPreferredNickname('institution:user')).resolves.toBeNull();
  });
});
