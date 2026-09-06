export const PWA_UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function shouldCheckForPwaUpdate(lastCheckedAt: number | null, now: number) {
  return lastCheckedAt === null || now - lastCheckedAt >= PWA_UPDATE_CHECK_INTERVAL_MS;
}
