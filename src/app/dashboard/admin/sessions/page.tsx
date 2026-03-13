import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/mongodb";
import Session from "@/models/Session";
import Role from "@/models/Role";
import { isAdmin } from "@/lib/permissions";
import dynamic from "next/dynamic";
import { Loading } from "@/components/ui/loading";

const SessionManager = dynamic(
  () => import("@/components/sessions/session-manager").then((mod) => ({ default: mod.SessionManager })),
  {
    loading: () => <Loading />,
    ssr: false,
  }
);

export default async function AdminSessionsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  await connectDB();
  const role = await Role.findById(session.user.role).populate("permissions").lean();

  if (!role || !isAdmin(role as any)) {
    redirect("/unauthorized");
  }

  const allSessions = await Session.find({})
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl font-bold lg:text-3xl">إدارة الجلسات</h1>
        <p className="mt-2 text-muted-foreground">
          إدارة جميع جلسات واتساب بما في ذلك الجلسات الافتراضية
        </p>
      </div>

      <SessionManager initialSessions={JSON.parse(JSON.stringify(allSessions))} isAdmin={true} />
    </div>
  );
}
