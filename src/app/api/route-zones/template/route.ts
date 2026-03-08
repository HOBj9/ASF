import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { toXlsxBuffer } from '@/lib/utils/excel.util';

export async function GET() {
  try {
    const authResult = await requirePermission(
      permissionResources.ROUTE_ZONES,
      permissionActions.CREATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const headers = ['name', 'الاسم', 'nameAr', 'الاسم العربي', 'order', 'الترتيب'];
    const rows = [
      { name: 'منطقة 1', 'الاسم': '', nameAr: 'منطقة 1', 'الاسم العربي': '', order: 1, 'الترتيب': '' },
    ];
    const buffer = toXlsxBuffer(headers, rows, { sheetName: 'المناطق' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="route-zones-template.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'خطأ' }, { status: 500 });
  }
}
