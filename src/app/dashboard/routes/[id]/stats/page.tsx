import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, isAdmin } from "@/lib/permissions";
import { permissionActions, permissionResources } from "@/constants/permissions";
import { getLabelsForSession } from "@/lib/utils/labels-server.util";
import { RouteStatsPageClient } from "./route-stats-page-client";
import { Loading } from "@/components/ui/loading";

export default async function RouteStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const role = session.user.role as any;
  if (!isAdmin(role) && !hasPermission(role, permissionResources.ROUTES, permissionActions.READ)) {
    redirect("/unauthorized");
  }

  const labels = await getLabelsForSession(session);
  const { id } = await params;

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">إحصائيات {labels.routeLabel}</h1>
        <p className="text-muted-foreground mt-2">
          سجل زيارات ونسبة الإنجاز حسب أيام العمل
        </p>
      </div>
      <Suspense fallback={<Loading text="جاري التحميل..." className="min-h-[200px]" />}>
        <RouteStatsPageClient routeId={id} labels={labels} />
      </Suspense>
    </div>
  );
}
