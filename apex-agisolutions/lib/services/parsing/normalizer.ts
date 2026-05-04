const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

export function normalizeDate(raw: string): string {
  if (!raw) return new Date().toISOString().split("T")[0];
  const cleaned = raw.trim().replace(/\s+/g, " ");

  let m = cleaned.match(/^(\d{1,2})[- \/]+([A-Za-z]{3,})[- \/]+(\d{2,4})/);
  if (m) {
    const month = MONTHS[m[2].substring(0, 3).toLowerCase()] || "01";
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${month}-${m[1].padStart(2, "0")}`;
  }

  m = cleaned.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  m = cleaned.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    let d = parseInt(m[1], 10);
    let mo = parseInt(m[2], 10);
    if (mo > 12 && d <= 12) {
      [d, mo] = [mo, d];
    }
    const month = mo <= 12 ? mo : 1;
    return `${year}-${month.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
  }

  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];

  return new Date().toISOString().split("T")[0];
}

export function cleanNumber(val: string | null, commaFormat: "indian" | "western" | "none" = "indian"): number {
  if (!val) return 0;
  let clean = val.replace(/cr/i, "").replace(/dr/i, "");
  if (commaFormat === "indian" || commaFormat === "western") {
    clean = clean.replace(/,/g, "");
  }
  clean = clean.replace(/[^0-9.-]/g, "");
  return parseFloat(clean) || 0;
}

export function toPaiseWithinInteger(value: number): number | null {
  const PG_INT_MAX = 2147483647;
  const PG_INT_MIN = -2147483648;
  const paise = Math.round(value * 100);
  if (paise > PG_INT_MAX || paise < PG_INT_MIN) return null;
  return paise;
}

export function findColumn(lower: string[], original: string[], candidates: string[]): string | null {
  for (const c of candidates) {
    const cLower = c.toLowerCase();
    const matchIdx = lower.findIndex(h => {
      if (h === cLower) return true;
      if (cLower.length <= 3) {
        return new RegExp(`\\b${cLower}\\b`).test(h);
      }
      return h.includes(cLower) || cLower.includes(h);
    });
    if (matchIdx >= 0) return original[matchIdx];
  }
  return null;
}

export function detectHeaderRow(
  rows: string[][],
  keywords: string[],
  maxPreambleRows: number = 5,
): { headers: string[]; headerRowIndex: number } {
  const limit = Math.min(maxPreambleRows + 10, rows.length);
  for (let i = 0; i < limit; i++) {
    const rowLow = rows[i].map(c => (c || "").toLowerCase().replace(/[^a-z0-9]/g, ""));
    const matchScore = rowLow.filter(c =>
      keywords.some(kw => c.includes(kw))
    ).length;
    if (matchScore >= 3 || (matchScore >= 2 && rows[i].length >= 3)) {
      return { headers: rows[i].map(h => h ? h.trim() : ""), headerRowIndex: i };
    }
  }
  return { headers: rows[0].map(h => h ? h.trim() : ""), headerRowIndex: 0 };
}

export function isFooterRow(row: string[], keywords: string[]): boolean {
  const joined = row.join(" ").toLowerCase();
  return keywords.some(kw => joined.includes(kw.toLowerCase()));
}
