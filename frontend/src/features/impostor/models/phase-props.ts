import type { ImpostorView } from '@/shared/models/realtime';

export interface PhaseProps {
  view: ImpostorView;
  meId: string;
  /** Segundos restantes de la fase actual. */
  seconds: number;
  nameOf: (userId: string | null) => string;
}
