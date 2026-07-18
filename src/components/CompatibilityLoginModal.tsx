import type { LoginDiagnosticRecorder } from '@/data/loginDiagnostics';

export interface CompatibilityLoginModalProps {
  visible: boolean;
  initialUrl: string | null;
  diagnostics: LoginDiagnosticRecorder | null;
  onClose(): void;
}

export function CompatibilityLoginModal(_props: CompatibilityLoginModalProps) {
  return null;
}
