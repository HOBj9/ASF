export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { GovernorateService } from '@/lib/services/governorate.service';

const governorateService = new GovernorateService();

function getCell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  const lowerKeys = keys.map((k) => k.toLowerCase());
  for (const [key, value] of Object.entries(row)) {
    if (
      key != null &&
      lowerKeys.includes(String(key).toLowerCase()) &&
      value != null &&
      String(value).trim() !== ''
    )
      return String(value).trim();
  }
  return '';
}

function getNum(row: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null) {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
  }
  const lowerKeys = keys.map((k) => k.toLowerCase());
  for (const [key, value] of Object.entries(row)) {
    if (key != null && lowerKeys.includes(String(key).toLowerCase())) {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.GOVERNORATES,
      permissionActions.CREATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'يجب رفع ملف Excel أو CSV' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer', raw: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) {
      return NextResponse.json({ error: 'الملف لا يحتوي على صفوف' }, { status: 400 });
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ imported: 0, skipped: 0, errors: ['لا توجد صفوف في الملف'] });
    }

    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i] as Record<string, unknown>;
      const name = getCell(raw, 'name', 'الاسم', 'اسم');
      const nameAr = getCell(raw, 'nameAr', 'name_ar', 'الاسم العربي');
      const order = getNum(raw, 'order', 'الترتيب');

      if (!name) {
        errors.push(`صف ${i + 2}: الاسم مطلوب`);
        skipped += 1;
        continue;
      }

      try {
        await governorateService.create(organizationId, {
          name: name.trim(),
          nameAr: nameAr || null,
          order: order ?? 0,
        });
        imported += 1;
      } catch (err: unknown) {
        errors.push(`صف ${i + 2}: ${err instanceof Error ? err.message : 'خطأ'}`);
        skipped += 1;
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      ...(errors.length > 0 ? { errors: errors.slice(0, 50) } : {}),
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
