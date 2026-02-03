function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

type CsvOptions = {
  includeBom?: boolean;
};

export function toCsv(
  rows: Array<Record<string, unknown>>,
  headers: string[],
  options: CsvOptions = {}
): string {
  const includeBom = options.includeBom ?? true;
  const lines: string[] = [];
  lines.push(headers.join(','));

  for (const row of rows) {
    const values = headers.map((header) => escapeCsvValue(row[header]));
    lines.push(values.join(','));
  }

  const csvBody = lines.join('\r\n');
  return includeBom ? `\uFEFF${csvBody}` : csvBody;
}
