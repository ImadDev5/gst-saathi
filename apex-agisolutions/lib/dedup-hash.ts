import crypto from "crypto";

export function dedupHash(
  statementId: string,
  transactionDate: string,
  description: string,
  amount: number,
): string {
  const raw = `${statementId}|${transactionDate}|${description.trim().toUpperCase()}|${amount}`;
  return crypto.createHash("sha256").update(raw).digest("hex").substring(0, 32);
}
