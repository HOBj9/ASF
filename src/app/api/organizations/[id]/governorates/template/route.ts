export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { toXlsxBuffer } from '@/lib/utils/excel.util';

export async function GET() {
  try {
    const authResult = await requirePermission(
      permissionResources.GOVERNORATES,
      permissionActions.CREATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const headers = ['name', 'الاسم', 'nameAr', 'الاسم العربي', 'order', 'الترتيب'];
    const rows = [
      {
        name: 'damascus',
        الاسم: '',
        nameAr: 'دمشق',
        'الاسم العربي': '',
        order: 1,
        الترتيب: '',
      },
    ];
    const buffer = toXlsxBuffer(headers, rows, { sheetName: 'المحافظات' });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="governorates-template.xlsx"',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'حدث خطأ' },
      { status: 500 }
    );
  }
}
