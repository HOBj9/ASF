import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/permissions";
import connectDB from "@/lib/mongodb";
import ContactSubmission from "@/models/ContactSubmission";
import { ContactSubmissionsTable } from "@/components/admin/contact-submissions-table";

export default async function ContactSubmissionsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userIsAdmin = isAdmin(session.user.role as any);

  if (!userIsAdmin) {
    redirect("/unauthorized");
  }

  await connectDB();
  const submissions = await ContactSubmission.find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl font-bold lg:text-3xl">رسائل التواصل</h1>
        <p className="mt-2 text-muted-foreground">
          عرض وإدارة جميع رسائل التواصل الواردة من الموقع
        </p>
      </div>

      <ContactSubmissionsTable
        initialSubmissions={JSON.parse(JSON.stringify(submissions))}
      />
    </div>
  );
}
