import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/middleware/api-auth.middleware";
import { isAdmin, isOrganizationAdmin } from "@/lib/permissions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { UserService } from "@/lib/services/user.service";
import { RoleService } from "@/lib/services/role.service";
import { successResponse } from "@/lib/utils/api.util";

const userService = new UserService();
const roleService = new RoleService();

function canManageLineSupervisors(session: any, organizationId: string): boolean {
  const role = session?.user?.role;
  if (isAdmin(role)) return true;
  if (isOrganizationAdmin(role) && session?.user?.organizationId?.toString() === organizationId) return true;
  return false;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;
    const { id: organizationId } = await params;

    if (!canManageLineSupervisors(session, organizationId)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    await connectDB();
    const lineSupervisorRole = await roleService.getByName("line_supervisor");
    if (!lineSupervisorRole) {
      return NextResponse.json({ users: [] });
    }

    const users = await User.find({
      organizationId,
      branchId: null,
      role: (lineSupervisorRole as any)._id,
    })
      .populate("role", "name nameAr")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ users });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;
    const { id: organizationId } = await params;

    if (!canManageLineSupervisors(session, organizationId)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, isActive } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة" },
        { status: 400 }
      );
    }

    await connectDB();
    const lineSupervisorRole = await roleService.getByName("line_supervisor");
    if (!lineSupervisorRole) {
      return NextResponse.json(
        { error: "دور مشرف الخط غير موجود في النظام" },
        { status: 500 }
      );
    }

    const user = await userService.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: String(password),
      role: (lineSupervisorRole as any)._id.toString(),
      organizationId,
      branchId: undefined,
      isActive: isActive ?? true,
    });

    const populated = await User.findById(user._id).populate("role", "name nameAr").lean();
    return successResponse({ user: populated || user });
  } catch (error: any) {
    return handleApiError(error);
  }
}
