const MARKETPLACE_PAGE_SIZE = 100;
const MAX_MARKETPLACE_PAGES = 100;
const MAX_COHORT_SIZE = 10_000;

/**
 * Return enough Marketplace pages to source the requested cohort when the
 * local catalog mirror is incomplete. The result is bounded to the same
 * 10,000-release product limit as the queue and publication workflows.
 */
export function defaultMarketplacePageCount(candidateCount) {
  const normalized = Number.isSafeInteger(candidateCount) ? candidateCount : 1;
  const boundedCount = Math.min(Math.max(normalized, 1), MAX_COHORT_SIZE);
  return Math.min(
    MAX_MARKETPLACE_PAGES,
    Math.max(3, Math.ceil(boundedCount / MARKETPLACE_PAGE_SIZE)),
  );
}

export const marketplacePagePolicy = Object.freeze({
  pageSize: MARKETPLACE_PAGE_SIZE,
  maxPages: MAX_MARKETPLACE_PAGES,
  maxCohortSize: MAX_COHORT_SIZE,
});
