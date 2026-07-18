import * as Crypto from 'expo-crypto';
import type { DiagnosticConsent } from './diagnosticPreferences';
import type { AuthStrategy, ResolvedInstitutionAuth, SupportStatus } from './universityAuthRegistry';
import { diagnosticUrlMetadata, type LoginDiagnosticStage, type LoginDiagnosticStep, type StructuralFailureReason } from './loginDiagnosticMetadata';
export * from './loginDiagnosticMetadata';

type DiagnosticEvent = { event: 'university_login_diagnostic_step' | 'university_compatibility_issue'; properties: Record<string, any> };
interface AnalyticsSink {
  capture(event: string, properties?: Record<string, any>): void;
  flush(): Promise<void>;
}

const MAX_DIAGNOSTIC_STEPS = 50;

export class LoginDiagnosticRecorder {
  readonly attemptId: string;
  readonly correlationId: string;
  readonly strategy: AuthStrategy;
  readonly supportStatus: SupportStatus;
  readonly configRevision: string;

  private consent: DiagnosticConsent;
  private stepIndex = 0;
  private buffered: DiagnosticEvent[] = [];
  private structuralSummaryRecorded = false;
  private navigationFingerprints = new Set<string>();

  private constructor(
    attemptId: string,
    correlationId: string,
    private readonly institutionId: string,
    private readonly institutionName: string,
    resolved: ResolvedInstitutionAuth,
    consent: DiagnosticConsent,
    private readonly analytics: AnalyticsSink,
  ) {
    this.attemptId = attemptId;
    this.correlationId = correlationId;
    this.strategy = resolved.strategy;
    this.supportStatus = resolved.status;
    this.configRevision = resolved.revision;
    this.consent = consent;
  }

  static async create(
    resolved: ResolvedInstitutionAuth,
    consent: DiagnosticConsent,
    analytics: AnalyticsSink,
  ): Promise<LoginDiagnosticRecorder> {
    const attemptId = Crypto.randomUUID();
    const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, attemptId);
    return new LoginDiagnosticRecorder(
      attemptId,
      digest.slice(0, 32),
      resolved.institution.id,
      resolved.institution.name,
      resolved,
      consent,
      analytics,
    );
  }

  private baseProperties(): Record<string, unknown> {
    return {
      attempt_id: this.correlationId,
      institution_id: this.institutionId,
      institution_name: this.institutionName,
      strategy: this.strategy,
      support_status: this.supportStatus,
      config_revision: this.configRevision,
    };
  }

  private emit(event: DiagnosticEvent): void {
    if (this.consent === 'denied') return;
    if (this.consent === 'unknown') {
      this.buffered.push(event);
      return;
    }
    this.analytics.capture(event.event, event.properties);
  }

  record(step: LoginDiagnosticStep): void {
    if (this.consent === 'denied' || this.stepIndex >= MAX_DIAGNOSTIC_STEPS) return;
    this.stepIndex += 1;
    this.emit({
      event: 'university_login_diagnostic_step',
      properties: { ...this.baseProperties(), step_index: this.stepIndex, ...step },
    });
  }

  recordNavigation(rawUrl: string, probeEvent: LoginDiagnosticStep['probe_event'] = 'navigation'): boolean {
    const metadata = diagnosticUrlMetadata(rawUrl);
    if (!metadata) return false;
    const fingerprint = `${probeEvent}:${metadata.host}:${metadata.path}:${metadata.query_keys.join(',')}`;
    if (this.navigationFingerprints.has(fingerprint)) return false;
    this.navigationFingerprints.add(fingerprint);
    this.record({
      stage: 'compatibility-probe',
      operation: 'probe-navigation',
      probe_event: probeEvent,
      ...metadata,
    });
    return true;
  }

  recordStructuralFailure(
    stage: LoginDiagnosticStage,
    reason: StructuralFailureReason,
    errorCode: string,
    status?: number,
  ): void {
    if (this.structuralSummaryRecorded || this.consent === 'denied') return;
    this.structuralSummaryRecorded = true;
    this.emit({
      event: 'university_compatibility_issue',
      properties: {
        ...this.baseProperties(),
        failure_stage: stage,
        reason,
        error_code: errorCode,
        ...(status === undefined ? {} : { status }),
        recorded_step_count: this.stepIndex,
      },
    });
  }

  grantConsent(): void {
    this.consent = 'granted';
    const pending = this.buffered;
    this.buffered = [];
    for (const event of pending) this.analytics.capture(event.event, event.properties);
  }

  denyConsent(): void {
    this.consent = 'denied';
    this.buffered = [];
  }

  discardBuffered(): void {
    this.buffered = [];
  }

  flush(): Promise<void> {
    return this.analytics.flush();
  }

  get bufferedEventCount(): number {
    return this.buffered.length;
  }
}
