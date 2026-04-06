export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { toXlsxBuffer } from '@/lib/utils/excel.util';

export async function GET() {
  try {
    const authResult = await requirePermission(permissionResources.CITIES, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const headers = ['name', 'الاسم', 'nameAr', 'الاسم العربي', 'order', 'الترتيب'];
    const rows = [
      {
        name: 'city-1',
        الاسم: '',
        nameAr: 'مدينة 1',
        'الاسم العربي': '',
        order: 1,
        الترتيب: '',
      },
    ];
    const buffer = toXlsxBuffer(headers, rows, { sheetName: 'المدن' });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="cities-template.xlsx"',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'حدث خطأ' },
      { status: 500 }
    );
  }
}
