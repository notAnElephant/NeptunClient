import { describe, expect, it } from 'vitest';
import { extractElteLoginCallback, shouldAttemptElteStudentWebHandoff, validateElteServiceUrl } from './elteExternalAuth';

describe('ELTE outer-login callback validation', () => {
  it('accepts the official HTTPS callback and either GUID casing', () => {
    expect(extractElteLoginCallback('https://hallgato5.neptun.elte.hu/outerlogin?GUID=12345678-1234-1234-1234-123456789abc&languageid=hu')).toEqual({ guid: '12345678-1234-1234-1234-123456789abc', serviceUrl: 'https://hallgato5.neptun.elte.hu/api' });
    expect(extractElteLoginCallback('https://hallgato2.neptun.elte.hu/OUTERLOGIN?guid=abcdefab-cdef-abcd-efab-cdefabcdefab')).toEqual({ guid: 'abcdefab-cdef-abcd-efab-cdefabcdefab', serviceUrl: 'https://hallgato2.neptun.elte.hu/api' });
  });

  it('rejects spoofed origins, insecure URLs, wrong paths, and malformed identifiers', () => {
    expect(extractElteLoginCallback('https://hallgato2.neptun.elte.hu.example.com/outerlogin?GUID=12345678-1234-1234-1234-123456789abc')).toBeNull();
    expect(extractElteLoginCallback('http://hallgato2.neptun.elte.hu/outerlogin?GUID=12345678-1234-1234-1234-123456789abc')).toBeNull();
    expect(extractElteLoginCallback('https://hallgato2.neptun.elte.hu/login?GUID=12345678-1234-1234-1234-123456789abc')).toBeNull();
    expect(extractElteLoginCallback('https://hallgato2.neptun.elte.hu/outerlogin?GUID=not-a-guid')).toBeNull();
  });

  it('accepts only numbered ELTE student API hosts', () => {
    expect(validateElteServiceUrl('https://hallgato5.neptun.elte.hu/api')).toBe('https://hallgato5.neptun.elte.hu/api');
    expect(validateElteServiceUrl('https://hallgato5.neptun.elte.hu/api/')).toBe('https://hallgato5.neptun.elte.hu/api');
    expect(validateElteServiceUrl('https://hallgato5.neptun.elte.hu.example.com/api')).toBeNull();
  });
});

describe('ELTE student-web handoff', () => {
  it('runs only on the authenticated ELTE portal landing page', () => {
    expect(shouldAttemptElteStudentWebHandoff('https://neptun.elte.hu/')).toBe(true);
    expect(shouldAttemptElteStudentWebHandoff('https://neptun.elte.hu/Account/Login')).toBe(false);
    expect(shouldAttemptElteStudentWebHandoff('https://neptun.elte.hu.example.com/')).toBe(false);
  });
});
