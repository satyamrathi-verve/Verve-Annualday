/*
  Tiny dependency-free CSV export for the super-admin sign-in log. RFC-4180-ish
  quoting: a field is wrapped in double-quotes (and any embedded quote doubled)
  whenever it contains a comma, quote, or newline — so names/emails survive a
  round-trip into Excel / Google Sheets intact.
*/

export function toCsv(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): string {
  const esc = (v: string | number | null | undefined): string => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // CRLF line endings — the safest default for Excel across Windows/Mac.
  return [headers, ...rows].map((cols) => cols.map(esc).join(",")).join("\r\n");
}

/** Trigger a client-side download of `content` as `filename` (no-op on the server). */
export function downloadCsv(filename: string, content: string): void {
  if (typeof window === "undefined") return;
  // Lead with a UTF-8 BOM (﻿) so Excel reads accented names / emails correctly.
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
