import { NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { MunicipalityService } from '@/lib/services/municipality.service';
import { UserService } from '@/lib/services/user.service';
import { RoleService } from '@/lib/services/role.service';

const municipalityService = new MunicipalityService();
const userService = new UserService();
const roleService = new RoleService();

export async function GET() {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const municipalities = await municipalityService.getAll();
    return NextResponse.json({ municipalities });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const {
      name,
      nameAr,
      governorate,
      areaName,
      addressText,
      centerLat,
      centerLng,
      timezone,
      atharKey,
      isActive,
      adminUserName,
      adminUserEmail,
      adminUserPassword,
    } = body;

    if (!name || !governorate || centerLat === undefined || centerLng === undefined) {
      return NextResponse.json(
        { error: 'الحقول المطلوبة: الاسم، المحافظة، الاحداثيات' },
        { status: 400 }
      );
    }

    if (!adminUserName || !adminUserEmail || !adminUserPassword) {
      return NextResponse.json(
        { error: 'بيانات مستخدم البلدية مطلوبة (الاسم، البريد، كلمة المرور)' },
        { status: 400 }
      );
    }

    const municipality = await municipalityService.create({
      name,
      nameAr,
      governorate,
      areaName,
      addressText,
      centerLat: Number(centerLat),
      centerLng: Number(centerLng),
      timezone,
      atharKey,
      isActive: isActive ?? true,
    });

    try {
      const defaultRole =
        (await roleService.getByName('municipality_admin')) ||
        (await roleService.getByName('user'));
      if (!defaultRole) {
        throw new Error('لم يتم العثور على دور المستخدم الافتراضي');
      }

      await userService.create({
        name: adminUserName,
        email: adminUserEmail,
        password: adminUserPassword,
        role: defaultRole._id.toString(),
        municipalityId: municipality._id.toString(),
        isActive: true,
      });
    } catch (error) {
      await municipalityService.delete(municipality._id.toString());
      throw error;
    }

    return NextResponse.json({ municipality }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
