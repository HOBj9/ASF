import * as XLSX from 'xlsx';

type XlsxOptions = {
  sheetName?: string;
  includeHeaders?: boolean;
};

function toRowArray(headers: string[], row: Record<string, unknown>): unknown[] {
  return headers.map((header) => row[header] ?? '');
}

export function toXlsxBuffer(
  headers: string[],
  rows: Array<Record<string, unknown>>,
  options: XlsxOptions = {}
): Buffer {
  const sheetName = options.sheetName || 'Data';
  const includeHeaders = options.includeHeaders ?? true;

  const aoa: unknown[][] = includeHeaders ? [headers] : [];
  for (const row of rows) {
    aoa.push(toRowArray(headers, row));
  }

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
}
