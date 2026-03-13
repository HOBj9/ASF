import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/permissions";
import connectDB from "@/lib/mongodb";
import VerificationTemplate from "@/models/VerificationTemplate";
import dynamic from "next/dynamic";
import { Loading } from "@/components/ui/loading";

const VerificationTemplatesManagement = dynamic(
  () =>
    import("@/components/admin/verification-templates-management").then((mod) => ({
      default: mod.VerificationTemplatesManagement,
    })),
  {
    loading: () => <Loading />,
    ssr: false,
  }
);

export default async function VerificationTemplatesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userIsAdmin = isAdmin(session.user.role as any);

  if (!userIsAdmin) {
    redirect("/unauthorized");
  }

  await connectDB();
  const templates = await VerificationTemplate.find({}).sort({ order: 1, createdAt: -1 }).lean();

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl font-bold lg:text-3xl">إدارة قوالب التحقق</h1>
        <p className="mt-2 text-muted-foreground">
          إدارة قوالب رسائل التحقق مع دعم المتغيرات {`{code}`}, {`{brandName}`}, {`{greeting}`}
        </p>
      </div>

      <VerificationTemplatesManagement initialTemplates={JSON.parse(JSON.stringify(templates))} />
    </div>
  );
}
