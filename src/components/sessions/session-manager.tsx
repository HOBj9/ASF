"use client";

type SessionItem = {
  _id: string;
  [key: string]: unknown;
};

export function SessionManager({
  initialSessions = [],
  isAdmin = false,
}: {
  initialSessions?: SessionItem[];
  isAdmin?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 text-right">
      <p className="text-muted-foreground">
        {initialSessions.length} جلسة متاحة. واجهة إدارة الجلسات قيد التطوير.
      </p>
      {isAdmin ? (
        <p className="mt-2 text-sm text-muted-foreground">
          وضع المدير مفعل، وستظهر أدوات الإدارة الكاملة هنا عند اكتمال الواجهة.
        </p>
      ) : null}
    </div>
  );
}
