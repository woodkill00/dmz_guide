// Functional HTTP completion bound, not a performance/SLA assertion. The full
// retained catalog takes ~29s to save on the measured local filesystem. Keep
// interaction, readiness, bitmap-decode and adversarial deadlines separate.
export const STUDIO_API_FUNCTIONAL_DEADLINE_MS = 90_000;
