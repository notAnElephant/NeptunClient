import { describe, expect, it } from 'vitest';
import { checkedJson } from './errors';

describe('checkedJson', () => {
  it('treats a Neptun login redirect as expired authentication', async () => {
    const response = new Response(null, { status: 302, headers: { Location: 'https://neptun.elte.hu/' } });
    await expect(checkedJson(response)).rejects.toMatchObject({ code: 'authentication', status: 302 });
  });
});
