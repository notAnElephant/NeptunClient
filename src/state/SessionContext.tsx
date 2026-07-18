import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { posthog } from '@/config/posthog';
import type { AuthResult, CaptchaInput, ExternalLoginInput, Institution, LoginInput, Session, Training, TwoFactorInput } from '@/domain/models';
import type { NeptunProvider } from '@/domain/provider';
import { createProvider } from '@/data/providerFactory';
import { clearSecureSession, loadSecureSession, saveSecureSession, type ProviderSecret } from '@/data/secureSession';
import { getInstitution } from '@/data/institutions';
import { clearCache } from '@/data/cache';
import { DemoProvider } from '@/data/providers/demo';
import { isStructuralProviderError, ProviderError } from '@/data/errors';
import { recordElteLoginDiagnostic } from '@/data/elteLoginDiagnostics';
import { institutionAnalyticsProperties } from '@/config/analytics';
import { clearCalendarWidgets } from '@/widgets/calendarWidgetSync';
import { getDiagnosticConsent, setDiagnosticConsent, type DiagnosticConsent } from '@/data/diagnosticPreferences';
import { deriveCompatibilityProbeUrl, LoginDiagnosticRecorder, type LoginDiagnosticStage } from '@/data/loginDiagnostics';
import { resolveInstitutionAuth, waitForUniversityAuthRegistry, type ResolvedInstitutionAuth } from '@/data/universityAuthRegistry';
import { shouldExposeCompatibilityFailure } from '@/data/compatibilityExperience';

interface CompatibilityFailure {
  consent: DiagnosticConsent;
  probeUrl: string | null;
}

type AuthFlow =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'captchaRequired'; identifier: string; imageUrl: string }
  | { state: 'twoFactorRequired'; challengeId?: string }
  | { state: 'error'; message: string; compatibility?: CompatibilityFailure };

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
  diagnosticConsent: DiagnosticConsent;
  compatibilityDiagnostics: LoginDiagnosticRecorder | null;
  prepareExternalLogin(institution: Institution): Promise<void>;
  cancelExternalLogin(): void;
  login(input: LoginInput): Promise<void>;
  loginExternal(input: ExternalLoginInput): Promise<void>;
  continueCaptcha(input: CaptchaInput): Promise<void>;
  continueTwoFactor(input: TwoFactorInput): Promise<void>;
  selectTraining(training: Training): Promise<void>;
  withAuthentication<T>(operation: (provider: NeptunProvider) => Promise<T>): Promise<T>;
  beginManualReauthentication(): Promise<void>;
  logout(): Promise<void>;
  setDiagnosticConsentForFuture(consent: DiagnosticConsent): Promise<void>;
  grantCompatibilityDiagnostics(): Promise<void>;
  denyCompatibilityDiagnostics(): Promise<void>;
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
  const [diagnosticConsent, setDiagnosticConsentState] = useState<DiagnosticConsent>('unknown');
  const [compatibilityDiagnostics, setCompatibilityDiagnostics] = useState<LoginDiagnosticRecorder | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const providerRef = useRef<NeptunProvider | null>(null);
  const secretRef = useRef<ProviderSecret | null>(null);
  const reauthenticationRef = useRef<ReauthenticationState>({ state: 'idle' });
  const recoveryPromiseRef = useRef<Promise<boolean> | null>(null);
  const diagnosticConsentRef = useRef<DiagnosticConsent>('unknown');
  const activeDiagnosticsRef = useRef<LoginDiagnosticRecorder | null>(null);
  const activeResolvedAuthRef = useRef<ResolvedInstitutionAuth | null>(null);
  const activeLoginInstitutionRef = useRef<Institution | null>(null);

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
    (async () => {
      const storedConsent = await getDiagnosticConsent();
      diagnosticConsentRef.current = storedConsent;
      setDiagnosticConsentState(storedConsent);
      if (process.env.EXPO_PUBLIC_DEMO_MODE === 'true') {
        const demoProvider = new DemoProvider();
        applyActiveSession({ institutionId: 'FI23344', provider: 'modern', userName: 'ABC123', activeTrainingId: 'training-1' }, demoProvider, { userName: 'ABC123', rememberMe: false });
        return;
      }
      const restored = await loadSecureSession();
      if (!restored) return;
      const institution = getInstitution(restored.session.institutionId);
      if (!institution) return;
      const restoredProvider = createProvider(institution, restored);
      if (restored.session.activeTrainingId) await restoredProvider.selectTraining(restored.session.activeTrainingId).catch((error) => {
        if (!(error instanceof ProviderError) || error.code !== 'authentication') throw error;
      });
      applyActiveSession(restored.session, restoredProvider, restored.secret);
    })().catch(async () => {
      await clearSecureSession();
    }).finally(() => setReady(true));
  }, [applyActiveSession]);

  const finishAuthentication = useCallback(async (result: AuthResult, activeProvider: NeptunProvider, nextSecret: ProviderSecret, completionStage: LoginDiagnosticStage = 'initial-login') => {
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
    const resolved = activeResolvedAuthRef.current;
    posthog.capture('user_logged_in', {
      ...institutionAnalyticsProperties(result.session.institutionId),
      provider: result.session.provider,
      strategy: resolved?.strategy ?? 'unknown',
      config_revision: resolved?.revision ?? 'unknown',
    });
    activeDiagnosticsRef.current?.record({ stage: completionStage, operation: 'authentication-complete' });
    if (diagnosticConsentRef.current === 'unknown') activeDiagnosticsRef.current?.discardBuffered();
    activeDiagnosticsRef.current = null;
    activeResolvedAuthRef.current = null;
    activeLoginInstitutionRef.current = null;
    setCompatibilityDiagnostics(null);
    setAuthFlow({ state: 'idle' });
    setLoginHint(null);
    setReauthenticationState({ state: 'idle' });
  }, [applyActiveSession, setReauthenticationState]);

  const handleLoginFailure = useCallback((error: unknown, fallbackStage: LoginDiagnosticStage, fallbackMessage: string) => {
    const recorder = activeDiagnosticsRef.current;
    const resolved = activeResolvedAuthRef.current;
    const institution = activeLoginInstitutionRef.current;
    const structural = isStructuralProviderError(error);
    if (structural) {
      recorder?.recordStructuralFailure(error.diagnosticStage ?? fallbackStage, error.structuralReason, error.code, error.status);
    }
    posthog.capture('login_failed', {
      ...(institution ? institutionAnalyticsProperties(institution.id) : {}),
      error_code: error instanceof ProviderError ? error.code : 'unknown',
      structural,
      strategy: resolved?.strategy ?? 'unknown',
      support_status: resolved?.status ?? 'unknown',
    });

    const message = error instanceof Error ? error.message : fallbackMessage;
    if (shouldExposeCompatibilityFailure(structural, resolved?.status, diagnosticConsentRef.current)) {
      const probeUrl = deriveCompatibilityProbeUrl(institution?.url ?? null);
      if (!probeUrl) recorder?.record({
        stage: 'compatibility-probe',
        operation: 'probe-availability',
        error_code: 'unsupported-contract',
        reason: 'invalid-url',
      });
      setCompatibilityDiagnostics(recorder);
      setAuthFlow({ state: 'error', message, compatibility: { consent: diagnosticConsentRef.current, probeUrl } });
      return;
    }

    if (diagnosticConsentRef.current === 'unknown') recorder?.discardBuffered();
    activeDiagnosticsRef.current = null;
    activeResolvedAuthRef.current = null;
    activeLoginInstitutionRef.current = null;
    setCompatibilityDiagnostics(null);
    setAuthFlow({ state: 'error', message });
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    setAuthFlow({ state: 'loading' });
    const nextSecret: ProviderSecret = { userName: input.userName.trim().toUpperCase(), password: input.password, rememberMe: input.rememberMe === true };
    try {
      activeDiagnosticsRef.current?.discardBuffered();
      await waitForUniversityAuthRegistry();
      const resolved = resolveInstitutionAuth(input.institution);
      const recorder = await LoginDiagnosticRecorder.create(resolved, diagnosticConsentRef.current, posthog);
      const activeProvider = createProvider(input.institution, undefined, { diagnostics: recorder, resolvedAuth: resolved });
      activeDiagnosticsRef.current = recorder;
      activeResolvedAuthRef.current = resolved;
      activeLoginInstitutionRef.current = input.institution;
      setCompatibilityDiagnostics(null);
      providerRef.current = activeProvider;
      secretRef.current = nextSecret;
      setProvider(activeProvider);
      setSecret(nextSecret);
      await finishAuthentication(await activeProvider.authenticate(input), activeProvider, nextSecret);
    }
    catch (error) {
      handleLoginFailure(error, 'initial-login', 'Sikertelen bejelentkezés.');
    }
  }, [finishAuthentication, handleLoginFailure]);

  const prepareExternalLogin = useCallback(async (institution: Institution) => {
    activeDiagnosticsRef.current?.discardBuffered();
    await waitForUniversityAuthRegistry();
    const resolved = resolveInstitutionAuth(institution);
    const recorder = await LoginDiagnosticRecorder.create(resolved, diagnosticConsentRef.current, posthog);
    activeDiagnosticsRef.current = recorder;
    activeResolvedAuthRef.current = resolved;
    activeLoginInstitutionRef.current = institution;
    setCompatibilityDiagnostics(null);
  }, []);

  const cancelExternalLogin = useCallback(() => {
    if (diagnosticConsentRef.current === 'unknown') activeDiagnosticsRef.current?.discardBuffered();
    activeDiagnosticsRef.current = null;
    activeResolvedAuthRef.current = null;
    activeLoginInstitutionRef.current = null;
    setCompatibilityDiagnostics(null);
  }, []);

  const loginExternal = useCallback(async (input: ExternalLoginInput) => {
    setAuthFlow({ state: 'loading' });
    try {
      let resolved = activeResolvedAuthRef.current;
      let recorder = activeDiagnosticsRef.current;
      if (!resolved || !recorder || activeLoginInstitutionRef.current?.id !== input.institution.id) {
        await waitForUniversityAuthRegistry();
        resolved = resolveInstitutionAuth(input.institution);
        recorder = await LoginDiagnosticRecorder.create(resolved, diagnosticConsentRef.current, posthog);
      }
      const activeProvider = createProvider(input.institution, undefined, { diagnostics: recorder, resolvedAuth: resolved });
      activeDiagnosticsRef.current = recorder;
      activeResolvedAuthRef.current = resolved;
      activeLoginInstitutionRef.current = input.institution;
      setCompatibilityDiagnostics(null);
      providerRef.current = activeProvider;
      setProvider(activeProvider);
      const result = await activeProvider.authenticateExternal(input);
      if (result.state !== 'authenticated') throw new ProviderError('authentication', 'Az ELTE bejelentkezése nem fejeződött be.');
      const nextSecret: ProviderSecret = { userName: result.session.userName, rememberMe: input.rememberMe === true };
      secretRef.current = nextSecret;
      setSecret(nextSecret);
      await finishAuthentication(result, activeProvider, nextSecret, 'user-info');
      recordElteLoginDiagnostic('app_session_created');
    } catch (error) {
      recordElteLoginDiagnostic('app_login_failed', {
        errorType: error instanceof ProviderError ? error.code : error instanceof Error ? error.name : 'unknown',
      });
      handleLoginFailure(error, 'external-exchange', 'A külső bejelentkezés sikertelen.');
    }
  }, [finishAuthentication, handleLoginFailure]);

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
    try { await finishAuthentication(await provider.continueCaptcha(input), provider, secret, 'captcha'); }
    catch (error) { handleLoginFailure(error, 'captcha', 'A CAPTCHA ellenőrzése sikertelen.'); }
  }, [finishAuthentication, handleLoginFailure, provider, secret]);

  const continueTwoFactor = useCallback(async (input: TwoFactorInput) => {
    if (!provider || !secret) return;
    setAuthFlow({ state: 'loading' });
    try { await finishAuthentication(await provider.continueTwoFactor(input), provider, secret, 'two-factor'); }
    catch (error) { handleLoginFailure(error, 'two-factor', 'A kód ellenőrzése sikertelen.'); }
  }, [finishAuthentication, handleLoginFailure, provider, secret]);

  const selectTraining = useCallback(async (training: Training) => {
    if (!session || !secret || !provider) return;
    await withAuthentication((activeProvider) => activeProvider.selectTraining(training.id));
    posthog.capture('training_selected', { training_id: training.id });
    const updated = { ...session, activeTrainingId: training.id };
    const activeSecret = secretRef.current;
    sessionRef.current = updated;
    setSession(updated);
    if (activeSecret) await saveSecureSession(updated, activeSecret);
  }, [provider, secret, session, withAuthentication]);

  const beginManualReauthentication = useCallback(async () => {
    posthog.capture('session_expired');
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
    posthog.capture('user_logged_out');
    const accountKey = session ? `${session.institutionId}:${session.userName}` : undefined;
    if (provider && session) await provider.logout(session).catch(() => undefined);
    if (accountKey) await clearCache(accountKey);
    await clearCalendarWidgets().catch(() => undefined);
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

  const setDiagnosticConsentForFuture = useCallback(async (consent: DiagnosticConsent) => {
    await setDiagnosticConsent(consent).catch(() => undefined);
    diagnosticConsentRef.current = consent;
    setDiagnosticConsentState(consent);
  }, []);

  const grantCompatibilityDiagnostics = useCallback(async () => {
    await setDiagnosticConsent('granted').catch(() => undefined);
    diagnosticConsentRef.current = 'granted';
    setDiagnosticConsentState('granted');
    const recorder = activeDiagnosticsRef.current;
    recorder?.grantConsent();
    setAuthFlow((current) => current.state === 'error' && current.compatibility
      ? { ...current, compatibility: { ...current.compatibility, consent: 'granted' } }
      : current);
    await recorder?.flush().catch(() => undefined);
  }, []);

  const denyCompatibilityDiagnostics = useCallback(async () => {
    await setDiagnosticConsent('denied').catch(() => undefined);
    diagnosticConsentRef.current = 'denied';
    setDiagnosticConsentState('denied');
    activeDiagnosticsRef.current?.denyConsent();
    activeDiagnosticsRef.current = null;
    activeResolvedAuthRef.current = null;
    activeLoginInstitutionRef.current = null;
    setCompatibilityDiagnostics(null);
    setAuthFlow((current) => current.state === 'error' ? { state: 'error', message: current.message } : current);
  }, []);

  const resetAuthFlow = useCallback(() => {
    if (diagnosticConsentRef.current === 'unknown') activeDiagnosticsRef.current?.discardBuffered();
    activeDiagnosticsRef.current = null;
    activeResolvedAuthRef.current = null;
    activeLoginInstitutionRef.current = null;
    setCompatibilityDiagnostics(null);
    setAuthFlow({ state: 'idle' });
  }, []);

  const value = useMemo(() => ({
    ready,
    session,
    provider,
    authFlow,
    reauthentication,
    loginHint,
    diagnosticConsent,
    compatibilityDiagnostics,
    prepareExternalLogin,
    cancelExternalLogin,
    login,
    loginExternal,
    continueCaptcha,
    continueTwoFactor,
    selectTraining,
    withAuthentication,
    beginManualReauthentication,
    logout,
    setDiagnosticConsentForFuture,
    grantCompatibilityDiagnostics,
    denyCompatibilityDiagnostics,
    resetAuthFlow,
  }), [authFlow, beginManualReauthentication, cancelExternalLogin, compatibilityDiagnostics, continueCaptcha, continueTwoFactor, denyCompatibilityDiagnostics, diagnosticConsent, grantCompatibilityDiagnostics, login, loginExternal, loginHint, logout, prepareExternalLogin, provider, ready, reauthentication, resetAuthFlow, selectTraining, session, setDiagnosticConsentForFuture, withAuthentication]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
