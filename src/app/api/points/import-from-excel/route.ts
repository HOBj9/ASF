import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { PointService } from '@/lib/services/point.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

const pointService = new PointService();

function normalizeNum(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getCell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  const lowerKeys = keys.map((k) => k.toLowerCase());
  for (const [key, value] of Object.entries(row)) {
    if (key != null && lowerKeys.includes(String(key).toLowerCase()) && value != null && String(value).trim() !== '')
      return String(value).trim();
  }
  return '';
}

function getNum(row: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null) return normalizeNum(v);
  }
  const lowerKeys = keys.map((k) => k.toLowerCase());
  for (const [key, value] of Object.entries(row)) {
    if (key != null && lowerKeys.includes(String(key).toLowerCase())) return normalizeNum(value);
  }
  return null;
}

/**
 * POST /api/points/import-from-excel
 * Body: formData with "file" (Excel/CSV) and optional "branchId".
 * Expected columns: name, id (optional), lat, long (or lng).
 */
export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const branchIdParam = formData.get('branchId');
    const branchId = resolveBranchId(session, typeof branchIdParam === 'string' ? branchIdParam : null);

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'يجب رفع ملف Excel أو CSV' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer', raw: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) {
      return NextResponse.json(
        { error: 'الملف لا يحتوي على صفوف' },
        { status: 400 }
      );
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ imported: 0, skipped: 0, errors: ['لا توجد صفوف في الملف'] });
    }

    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const raw = row as Record<string, unknown>;
      const name = getCell(raw, 'name');
      const idStr = getCell(raw, 'id');
      const lat = getNum(raw, 'lat', 'latitude');
      const lng = getNum(raw, 'long', 'lng', 'longitude');

      if (!name) {
        errors.push(`صف ${i + 2}: الاسم مطلوب`);
        skipped += 1;
        continue;
      }
      if (lat == null || lng == null) {
        errors.push(`صف ${i + 2}: خط العرض وخط الطول مطلوبان (قيم رقمية)`);
        skipped += 1;
        continue;
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        errors.push(`صف ${i + 2}: إحداثيات غير صالحة`);
        skipped += 1;
        continue;
      }

      try {
        await pointService.create({
          branchId,
          name,
          nameAr: idStr || undefined,
          lat,
          lng,
          radiusMeters: 500,
          type: 'container',
          isActive: true,
          createdByUserId: session?.user?.id ?? null,
        });
        imported += 1;
      } catch (err: any) {
        if (err?.message?.includes('موجودة مسبقاً')) {
          skipped += 1;
        } else {
          errors.push(`صف ${i + 2}: ${err?.message || 'خطأ'}`);
          skipped += 1;
        }
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      ...(errors.length > 0 ? { errors: errors.slice(0, 50) } : {}),
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
