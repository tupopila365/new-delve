/**
 * Messaging feature gates — flip on when Backend V2 endpoints ship.
 * Keeps production UI from showing demo flows or fake success states.
 */
export const MESSAGE_FEATURES = {
  reports: false,
  locationShare: false,
  safetyCases: false,
  immediateSafetyEscalation: false,
} as const
