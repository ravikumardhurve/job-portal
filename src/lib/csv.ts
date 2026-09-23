function safeCell(value: unknown) {
  const raw = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  const protectedValue = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${protectedValue.replaceAll('"', '""')}"`;
}

export function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "No records\r\n";
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return [headers.map(safeCell).join(","), ...rows.map((row) => headers.map((header) => safeCell(row[header])).join(","))].join("\r\n");
}
