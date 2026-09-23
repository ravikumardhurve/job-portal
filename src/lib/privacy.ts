export const PRIVACY_POLICY_VERSION = "2026-09-21";
export const TERMS_VERSION = "2026-09-21";
export const DOCUMENT_CONSENT_VERSION = "2026-09-21";
export const RETENTION_REVIEW_MONTHS = 24;

export function retentionReviewDate(from = new Date()) {
  const review = new Date(from);
  review.setUTCMonth(review.getUTCMonth() + RETENTION_REVIEW_MONTHS);
  return review.toISOString();
}
