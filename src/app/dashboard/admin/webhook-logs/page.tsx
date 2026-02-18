import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/permissions";
import dynamic from "next/dynamic";

const WebhookLogsTable = dynamic(
  () =>
    import("@/components/admin/webhook-logs-table").then((m) => ({
      default: m.WebhookLogsTable,
    })),
  { ssr: false, loading: () => <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div> }
);

export default async function WebhookLogsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userIsAdmin = isAdmin(session.user.role as any);

  if (!userIsAdmin) {
    redirect("/unauthorized");
  }

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">سجل طلبات Webhook</h1>
        <p className="text-muted-foreground mt-2">
          عرض الطلبات الواردة إلى webhook أثر (للمشرف فقط)
        </p>
      </div>
      <WebhookLogsTable />
    </div>
  );
}
