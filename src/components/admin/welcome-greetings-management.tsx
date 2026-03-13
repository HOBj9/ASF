"use client";

type GreetingItem = {
  _id: string;
  [key: string]: unknown;
};

export function WelcomeGreetingsManagement({
  initialGreetings = [],
}: {
  initialGreetings?: GreetingItem[];
}) {
  return (
    <div className="rounded-xl border bg-card p-6 text-right">
      <p className="text-muted-foreground">
        {initialGreetings.length} عبارة ترحيبية. واجهة إدارة العبارات الترحيبية قيد التطوير.
      </p>
    </div>
  );
}
