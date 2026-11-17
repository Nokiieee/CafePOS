// Voiding a paid order (see supabase/voids.sql). Shared by the Void popup and
// the voidOrder action, so both use the same reasons and the same limit.

/** The reasons to pick from. The popup adds "Other", where the admin types one. */
export const VOID_REASONS = [
  "Wrong item",
  "Charged twice",
  "Customer cancelled",
  "Test order",
] as const;

/** The longest reason the database accepts. */
export const MAX_VOID_REASON_LENGTH = 200;
