import { posthog } from './posthog';
import { getInstitution } from '@/data/institutions';
import type { Session } from '@/domain/models';

export type TrackedFeature = 'trainings' | 'student_profile' | 'terms' | 'calendar' | 'unread_messages' | 'exams' | 'messages' | 'message_detail';

export function institutionAnalyticsProperties(institutionId: string) {
  const institution = getInstitution(institutionId);
  return {
    institution_id: institutionId,
    institution_name: institution?.name ?? institutionId,
    institution_provider: institution?.provider ?? 'unknown',
    authentication_mode: institution?.authenticationMode ?? 'unknown',
  };
}

export function captureFeatureUsed(session: Session, feature: TrackedFeature): void {
  posthog.capture('feature_used', {
    ...institutionAnalyticsProperties(session.institutionId),
    feature,
  });
}
