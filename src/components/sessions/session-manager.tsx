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
    </div>
  );
}
