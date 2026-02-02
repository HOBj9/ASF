"use client";

type TemplateItem = {
  _id: string;
  [key: string]: unknown;
};

export function VerificationTemplatesManagement({
  initialTemplates = [],
}: {
  initialTemplates?: TemplateItem[];
}) {
  return (
    <div className="rounded-xl border bg-card p-6 text-right">
      <p className="text-muted-foreground">
        {initialTemplates.length} قالب تحقق. واجهة إدارة القوالب قيد التطوير.
      </p>
    </div>
  );
}
