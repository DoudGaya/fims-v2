/**
 * Sensitive Field Management for the FIMS Public API
 *
 * Fields are grouped into three sensitivity categories.
 * By default ALL groups are redacted from third-party API responses.
 *
 * ⚠️  ADMIN NOTICE:
 *   `allowSensitiveFields` on an ApiKey should ONLY be enabled for internal
 *   CCSA products (e.g. payment processing, internal reporting dashboards).
 *   It must NEVER be enabled for third-party or public integrations.
 */

// ─── Sensitivity Groups ──────────────────────────────────────────────────────

export const SENSITIVE_FIELD_GROUPS = {
  /** National identity numbers */
  identity: ['nin'] as const,

  /**
   * Financial / banking data.
   * ⚠️  Never expose to external partners.
   */
  financial: ['bvn', 'bankName', 'accountNumber', 'accountName'] as const,

  /**
   * Direct contact details.
   * Redacted by default; may be enabled for approved use-cases.
   */
  contact: ['phone', 'email', 'whatsAppNumber'] as const,
} as const;

/** All sensitive field names as a flat array (for reference/documentation). */
export const ALL_SENSITIVE_FIELDS: string[] = [
  ...SENSITIVE_FIELD_GROUPS.identity,
  ...SENSITIVE_FIELD_GROUPS.financial,
  ...SENSITIVE_FIELD_GROUPS.contact,
];

// ─── Redaction Helpers ────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

/**
 * Redact sensitive fields from a farmer object.
 *
 * @param farmer              Raw DB farmer record.
 * @param allowSensitiveFields  When true (internal CCSA token only) all fields are returned.
 * @returns A new object with redacted fields replaced by `null`.
 */
export function redactFarmer<T extends AnyRecord>(
  farmer: T,
  allowSensitiveFields: boolean
): T {
  if (allowSensitiveFields) return farmer;

  const redacted = { ...farmer } as AnyRecord;
  for (const field of ALL_SENSITIVE_FIELDS) {
    if (field in redacted) {
      redacted[field] = null;
    }
  }
  return redacted as T;
}

/**
 * Redact sensitive fields from an array of farmer objects.
 */
export function redactFarmers<T extends AnyRecord>(
  farmers: T[],
  allowSensitiveFields: boolean
): T[] {
  if (allowSensitiveFields) return farmers;
  return farmers.map((f) => redactFarmer(f, false));
}

/**
 * Build a safe public-facing label of which groups are active/redacted.
 * Returned in API responses to inform the consumer what they cannot see.
 */
export function buildFieldVisibilityMeta(allowSensitiveFields: boolean) {
  return {
    sensitiveFieldsExposed: allowSensitiveFields,
    redactedGroups: allowSensitiveFields
      ? []
      : Object.keys(SENSITIVE_FIELD_GROUPS),
    note: allowSensitiveFields
      ? 'All fields are included in this response.'
      : 'Identity, financial and contact fields are redacted. Contact your CCSA administrator to enable sensitive field access.',
  };
}
