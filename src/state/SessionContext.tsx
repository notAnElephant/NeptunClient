import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { AuthResult, CaptchaInput, LoginInput, Session, Training, TwoFactorInput } from '@/domain/models';
import type { NeptunProvider } from '@/domain/provider';
import { createProvider } from '@/data/providerFactory';
import { clearSecureSession, loadSecureSession, saveSecureSession, type ProviderSecret } from '@/data/secureSession';
import { getInstitution } from '@/data/institutions';
import { clearCache } from '@/data/cache';
import { DemoProvider } from '@/data/providers/demo';

type AuthFlow =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'captchaRequired'; identifier: string; imageUrl: string }
  | { state: 'twoFactorRequired'; challengeId?: string }
  | { state: 'error'; message: string };

interface SessionContextValue {
  ready: boolean;
  session: Session | null;
  provider: NeptunProvider | null;
  authFlow: AuthFlow;
  login(input: LoginInput): Promise<void>;
  continueCaptcha(input: CaptchaInput): Promise<void>;
  continueTwoFactor(input: TwoFactorInput): Promise<void>;
  selectTraining(training: Training): Promise<void>;
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

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_DEMO_MODE === 'true') {
      setSession({ institutionId: 'FI23344', provider: 'modern', userName: 'ABC123', activeTrainingId: 'training-1' });
      setSecret({ userName: 'ABC123' });
      setProvider(new DemoProvider());
      setReady(true);
      return;
    }
    loadSecureSession().then(async (restored) => {
      if (!restored) return;
      const institution = getInstitution(restored.session.institutionId);
      if (!institution) return;
      const restoredProvider = createProvider(institution, restored);
      if (restored.session.activeTrainingId) await restoredProvider.selectTraining(restored.session.activeTrainingId);
      setSession(restored.session);
      setSecret(restored.secret);
      setProvider(restoredProvider);
    }).catch(async () => {
      await clearSecureSession();
    }).finally(() => setReady(true));
  }, []);

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
    setSession(result.session);
    setProvider(activeProvider);
    setSecret(nextSecret);
    setAuthFlow({ state: 'idle' });
    await saveSecureSession(result.session, { ...nextSecret, accessToken: result.session.accessToken });
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    setAuthFlow({ state: 'loading' });
    const activeProvider = createProvider(input.institution);
    const nextSecret = { userName: input.userName.trim().toUpperCase(), password: input.institution.provider === 'legacy' ? input.password : undefined };
    setProvider(activeProvider);
    setSecret(nextSecret);
    try { await finishAuthentication(await activeProvider.authenticate(input), activeProvider, nextSecret); }
    catch (error) { setAuthFlow({ state: 'error', message: error instanceof Error ? error.message : 'Sikertelen bejelentkezés.' }); }
  }, [finishAuthentication]);

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
    await provider.selectTraining(training.id);
    const updated = { ...session, activeTrainingId: training.id };
    setSession(updated);
    await saveSecureSession(updated, secret);
  }, [provider, secret, session]);

  const logout = useCallback(async () => {
    const accountKey = session ? `${session.institutionId}:${session.userName}` : undefined;
    if (provider && session) await provider.logout(session).catch(() => undefined);
    if (accountKey) await clearCache(accountKey);
    await clearSecureSession();
    setSession(null);
    setProvider(null);
    setSecret(null);
    setAuthFlow({ state: 'idle' });
  }, [provider, session]);

  const value = useMemo(() => ({ ready, session, provider, authFlow, login, continueCaptcha, continueTwoFactor, selectTraining, logout, resetAuthFlow: () => setAuthFlow({ state: 'idle' }) }), [authFlow, continueCaptcha, continueTwoFactor, login, logout, provider, ready, selectTraining, session]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
