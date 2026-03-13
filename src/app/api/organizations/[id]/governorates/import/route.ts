import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { GovernorateService } from '@/lib/services/governorate.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { isAdmin } from '@/lib/permissions';
import connectDB from '@/lib/mongodb';
import Branch from '@/models/Branch';

const service = new GovernorateService();

async function ensureOrgAccess(session: any, organizationId: string): Promise<void> {
  if (isAdmin(session?.user?.role)) return;
  const sessionOrg = session?.user?.organizationId?.toString?.();
  if (sessionOrg === organizationId) return;
  const branchId = session?.user?.branchId?.toString?.();
  if (branchId) {
    await connectDB();
    const branch = await Branch.findById(branchId).select('organizationId').lean();
    if (branch && String(branch.organizationId) === organizationId) return;
  }
  throw new Error('لا يمكنك الوصول إلى هذه المؤسسة');
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
    const { id: organizationId } = await params;
    await ensureOrgAccess(session, organizationId);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

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
        await service.create(organizationId, {
          name: name.trim(),
          nameAr: nameAr || null,
          order: order ?? 0,
        });
        imported += 1;
      } catch (err: any) {
        errors.push(`صف ${i + 2}: ${err?.message || 'خطأ'}`);
        skipped += 1;
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
