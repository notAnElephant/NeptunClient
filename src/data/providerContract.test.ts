import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('read-only provider boundary', () => {
  it('does not expose Neptun mutations in the public contract', () => {
    const source = readFileSync(resolve('src/domain/provider.ts'), 'utf8');
    for (const forbidden of ['SetReadedMessage', 'SaveSubject', 'SendMessage', 'SetExamSigning', 'RemoveMessage']) expect(source).not.toContain(forbidden);
    expect(source).not.toMatch(/\bpost\s*\(/i);
  });
  it('keeps raw Neptun paths inside provider adapters', () => {
    const querySource = readFileSync(resolve('src/data/queries.ts'), 'utf8');
    expect(querySource).not.toContain('MobileService.svc');
    expect(querySource).not.toContain('/hallgatoi/api');
  });
});
