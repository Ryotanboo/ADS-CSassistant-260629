/**
 * ALLOWED_EMAILS（カンマ区切り）のパースと判定。
 * 未設定・空は fail-closed（誰も許可しない）。
 */
export function getAllowedEmails(): Set<string> {
  const raw = process.env.ALLOWED_EMAILS ?? "";
  const emails = raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return new Set(emails);
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = getAllowedEmails();
  if (allowed.size === 0) return false;
  return allowed.has(email.trim().toLowerCase());
}
