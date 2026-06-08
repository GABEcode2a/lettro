export const FREE_JOB_LIMIT = 5;

export type UsageAccessFlags = {
  is_pro: boolean;
  is_admin: boolean;
};

/** Pro and admin users bypass free-tier generation limits. */
export function hasUnlimitedGenerations(flags: UsageAccessFlags): boolean {
  return flags.is_pro || flags.is_admin;
}

export function isOverFreeLimit(
  currentCount: number,
  freeLimit: number,
  flags: UsageAccessFlags,
): boolean {
  return !hasUnlimitedGenerations(flags) && currentCount >= freeLimit;
}
