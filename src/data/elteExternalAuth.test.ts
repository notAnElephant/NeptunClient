import { describe, expect, it } from 'vitest';
import { extractElteLoginGuid } from './elteExternalAuth';

describe('ELTE outer-login callback validation', () => {
  it('accepts the official HTTPS callback and either GUID casing', () => {
    expect(extractElteLoginGuid('https://hallgato2.neptun.elte.hu/outerlogin?GUID=12345678-1234-1234-1234-123456789abc')).toBe('12345678-1234-1234-1234-123456789abc');
    expect(extractElteLoginGuid('https://hallgato2.neptun.elte.hu/OUTERLOGIN?guid=abcdefab-cdef-abcd-efab-cdefabcdefab')).toBe('abcdefab-cdef-abcd-efab-cdefabcdefab');
  });

  it('rejects spoofed origins, insecure URLs, wrong paths, and malformed identifiers', () => {
    expect(extractElteLoginGuid('https://hallgato2.neptun.elte.hu.example.com/outerlogin?GUID=12345678-1234-1234-1234-123456789abc')).toBeNull();
    expect(extractElteLoginGuid('http://hallgato2.neptun.elte.hu/outerlogin?GUID=12345678-1234-1234-1234-123456789abc')).toBeNull();
    expect(extractElteLoginGuid('https://hallgato2.neptun.elte.hu/login?GUID=12345678-1234-1234-1234-123456789abc')).toBeNull();
    expect(extractElteLoginGuid('https://hallgato2.neptun.elte.hu/outerlogin?GUID=not-a-guid')).toBeNull();
  });
});
