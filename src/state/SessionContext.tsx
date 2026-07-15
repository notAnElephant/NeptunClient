import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import type { AuthResult, CaptchaInput, LoginInput, Session, Training, TwoFactorInput } from '@/domain/models';
import type { NeptunProvider } from '@/domain/provider';
import { createProvider } from '@/data/providerFactory';
import { clearSecureSession, loadSecureSession, saveSecureSession, type ProviderSecret } from '@/data/secureSession';
import { getInstitution } from '@/data/institutions';
import { clearCache } from '@/data/cache';
import { DemoProvider } from '@/data/providers/demo';
import { ProviderError } from '@/data/errors';

type AuthFlow =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'captchaRequired'; identifier: string; imageUrl: string }
  | { state: 'twoFactorRequired'; challengeId?: string }
  | { state: 'error'; message: string };

type ReauthenticationState =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'manualRequired'; message: string };

interface LoginHint { institutionId: string; userName: string }

interface SessionContextValue {
  ready: boolean;
  session: Session | null;
  provider: NeptunProvider | null;
  authFlow: AuthFlow;
  reauthentication: ReauthenticationState;
  loginHint: LoginHint | null;
  login(input: LoginInput): Promise<void>;
  continueCaptcha(input: CaptchaInput): Promise<void>;
  continueTwoFactor(input: TwoFactorInput): Promise<void>;
  selectTraining(training: Training): Promise<void>;
  withAuthentication<T>(operation: (provider: NeptunProvider) => Promise<T>): Promise<T>;
  beginManualReauthentication(): Promise<void>;
  logout(): Promise<void>;
  resetAuthFlow(): void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [provider, setProvider] = useState<NeptunProvider | null>(null);
  const [secret, setSecret] = useState<ProviderSecret | null>(null);
  const [authFlow, setAuthFlow] = useState<AuthFlow>({ state: 'idle' });
  const [reauthentication, setReauthentication] = useState<ReauthenticationState>({ state: 'idle' });
  const [loginHint, setLoginHint] = useState<LoginHint | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const providerRef = useRef<NeptunProvider | null>(null);
  const secretRef = useRef<ProviderSecret | null>(null);
  const reauthenticationRef = useRef<ReauthenticationState>({ state: 'idle' });
  const recoveryPromiseRef = useRef<Promise<boolean> | null>(null);

  const applyActiveSession = useCallback((nextSession: Session, nextProvider: NeptunProvider, nextSecret: ProviderSecret) => {
    sessionRef.current = nextSession;
    providerRef.current = nextProvider;
    secretRef.current = nextSecret;
    setSession(nextSession);
    setProvider(nextProvider);
    setSecret(nextSecret);
  }, []);

  const setReauthenticationState = useCallback((next: ReauthenticationState) => {
    reauthenticationRef.current = next;
    setReauthentication(next);
  }, []);

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_DEMO_MODE === 'true') {
      const demoProvider = new DemoProvider();
      applyActiveSession({ institutionId: 'FI23344', provider: 'modern', userName: 'ABC123', activeTrainingId: 'training-1' }, demoProvider, { userName: 'ABC123', rememberMe: false });
      setReady(true);
      return;
    }
    loadSecureSession().then(async (restored) => {
      if (!restored) return;
      const institution = getInstitution(restored.session.institutionId);
      if (!institution) return;
      const restoredProvider = createProvider(institution, restored);
      if (restored.session.activeTrainingId) await restoredProvider.selectTraining(restored.session.activeTrainingId).catch((error) => {
        if (!(error instanceof ProviderError) || error.code !== 'authentication') throw error;
      });
      applyActiveSession(restored.session, restoredProvider, restored.secret);
    }).catch(async () => {
      await clearSecureSession();
    }).finally(() => setReady(true));
  }, [applyActiveSession]);

  const finishAuthentication = useCallback(async (result: AuthResult, activeProvider: NeptunProvider, nextSecret: ProviderSecret) => {
    if (result.state === 'captchaRequired') {
      if (!result.imageUrl) throw new Error('A CAPTCHA-kép hiányzik.');
      setAuthFlow({ state: result.state, identifier: result.identifier, imageUrl: result.imageUrl });
      return;
    }
    if (result.state === 'twoFactorRequired') {
      setAuthFlow({ state: result.state, challengeId: result.challengeId });
      return;
    }
    const persistedSecret = { ...nextSecret, accessToken: result.session.accessToken };
    await saveSecureSession(result.session, persistedSecret);
    applyActiveSession(result.session, activeProvider, persistedSecret);
    setAuthFlow({ state: 'idle' });
    setLoginHint(null);
    setReauthenticationState({ state: 'idle' });
  }, [applyActiveSession, setReauthenticationState]);

  const login = useCallback(async (input: LoginInput) => {
    setAuthFlow({ state: 'loading' });
    const activeProvider = createProvider(input.institution);
    const nextSecret: ProviderSecret = { userName: input.userName.trim().toUpperCase(), password: input.password, rememberMe: input.rememberMe === true };
    providerRef.current = activeProvider;
    secretRef.current = nextSecret;
    setProvider(activeProvider);
    setSecret(nextSecret);
    try { await finishAuthentication(await activeProvider.authenticate(input), activeProvider, nextSecret); }
    catch (error) { setAuthFlow({ state: 'error', message: error instanceof Error ? error.message : 'Sikertelen bejelentkezés.' }); }
  }, [finishAuthentication]);

  const recoverAuthentication = useCallback((): Promise<boolean> => {
    if (recoveryPromiseRef.current) return recoveryPromiseRef.current;
    const recovery = (async () => {
      const activeSession = sessionRef.current;
      const activeProvider = providerRef.current;
      const activeSecret = secretRef.current;
      if (!activeSession || !activeProvider || !activeSecret) return false;
      setReauthenticationState({ state: 'loading' });

      try {
        const refreshed = await activeProvider.refreshSession(activeSession);
        const refreshedSecret = { ...activeSecret, accessToken: refreshed.accessToken };
        if (refreshed.activeTrainingId) await activeProvider.selectTraining(refreshed.activeTrainingId);
        await saveSecureSession(refreshed, refreshedSecret);
        applyActiveSession(refreshed, activeProvider, refreshedSecret);
        setReauthenticationState({ state: 'idle' });
        return true;
      } catch {
        // A full login below is the fallback when token refresh is no longer possible.
      }

      if (activeSecret.rememberMe && activeSecret.password) {
        const institution = getInstitution(activeSession.institutionId);
        if (institution) {
          try {
            const result = await activeProvider.authenticate({ institution, userName: activeSecret.userName, password: activeSecret.password, rememberMe: true });
            if (result.state === 'authenticated') {
              const restoredSession = { ...result.session, activeTrainingId: activeSession.activeTrainingId };
              if (restoredSession.activeTrainingId) await activeProvider.selectTraining(restoredSession.activeTrainingId);
              const restoredSecret = { ...activeSecret, accessToken: restoredSession.accessToken };
              await saveSecureSession(restoredSession, restoredSecret);
              applyActiveSession(restoredSession, activeProvider, restoredSecret);
              setReauthenticationState({ state: 'idle' });
              return true;
            }
          } catch (error) {
            if (error instanceof ProviderError && error.code === 'authentication') {
              await clearSecureSession();
              secretRef.current = { ...activeSecret, password: undefined, accessToken: undefined, rememberMe: false };
              setSecret(secretRef.current);
            }
          }
        }
      }

      setReauthenticationState({ state: 'manualRequired', message: 'A munkamenet lejárt. A folytatáshoz jelentkezz be újra.' });
      return false;
    })().finally(() => { recoveryPromiseRef.current = null; });
    recoveryPromiseRef.current = recovery;
    return recovery;
  }, [applyActiveSession, setReauthenticationState]);

  const withAuthentication = useCallback(async <T,>(operation: (activeProvider: NeptunProvider) => Promise<T>): Promise<T> => {
    const activeProvider = providerRef.current;
    if (!activeProvider) throw new Error('Nincs aktív munkamenet.');
    try {
      return await operation(activeProvider);
    } catch (error) {
      if (!(error instanceof ProviderError) || error.code !== 'authentication' || reauthenticationRef.current.state === 'manualRequired') throw error;
      if (!await recoverAuthentication()) throw error;
      const recoveredProvider = providerRef.current;
      if (!recoveredProvider) throw error;
      try {
        return await operation(recoveredProvider);
      } catch (retryError) {
        if (retryError instanceof ProviderError && retryError.code === 'authentication') {
          setReauthenticationState({ state: 'manualRequired', message: 'A munkamenet lejárt. A folytatáshoz jelentkezz be újra.' });
        }
        throw retryError;
      }
    }
  }, [recoverAuthentication, setReauthenticationState]);

  const continueCaptcha = useCallback(async (input: CaptchaInput) => {
    if (!provider || !secret) return;
    setAuthFlow({ state: 'loading' });
    try { await finishAuthentication(await provider.continueCaptcha(input), provider, secret); }
    catch (error) { setAuthFlow({ state: 'error', message: error instanceof Error ? error.message : 'A CAPTCHA ellenőrzése sikertelen.' }); }
  }, [finishAuthentication, provider, secret]);

  const continueTwoFactor = useCallback(async (input: TwoFactorInput) => {
    if (!provider || !secret) return;
    setAuthFlow({ state: 'loading' });
    try { await finishAuthentication(await provider.continueTwoFactor(input), provider, secret); }
    catch (error) { setAuthFlow({ state: 'error', message: error instanceof Error ? error.message : 'A kód ellenőrzése sikertelen.' }); }
  }, [finishAuthentication, provider, secret]);

  const selectTraining = useCallback(async (training: Training) => {
    if (!session || !secret || !provider) return;
    await withAuthentication((activeProvider) => activeProvider.selectTraining(training.id));
    const updated = { ...session, activeTrainingId: training.id };
    const activeSecret = secretRef.current;
    sessionRef.current = updated;
    setSession(updated);
    if (activeSecret) await saveSecureSession(updated, activeSecret);
  }, [provider, secret, session, withAuthentication]);

  const beginManualReauthentication = useCallback(async () => {
    const activeSession = sessionRef.current;
    if (activeSession) setLoginHint({ institutionId: activeSession.institutionId, userName: activeSession.userName });
    await clearSecureSession();
    sessionRef.current = null;
    providerRef.current = null;
    secretRef.current = null;
    setSession(null);
    setProvider(null);
    setSecret(null);
    setAuthFlow({ state: 'idle' });
    setReauthenticationState({ state: 'idle' });
  }, [setReauthenticationState]);

  const logout = useCallback(async () => {
    const accountKey = session ? `${session.institutionId}:${session.userName}` : undefined;
    if (provider && session) await provider.logout(session).catch(() => undefined);
    if (accountKey) await clearCache(accountKey);
    await clearSecureSession();
    setSession(null);
    setProvider(null);
    setSecret(null);
    sessionRef.current = null;
    providerRef.current = null;
    secretRef.current = null;
    setLoginHint(null);
    setAuthFlow({ state: 'idle' });
    setReauthenticationState({ state: 'idle' });
  }, [provider, session, setReauthenticationState]);

  const value = useMemo(() => ({ ready, session, provider, authFlow, reauthentication, loginHint, login, continueCaptcha, continueTwoFactor, selectTraining, withAuthentication, beginManualReauthentication, logout, resetAuthFlow: () => setAuthFlow({ state: 'idle' }) }), [authFlow, beginManualReauthentication, continueCaptcha, continueTwoFactor, login, loginHint, logout, provider, ready, reauthentication, selectTraining, session, withAuthentication]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
