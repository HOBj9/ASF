"use client";

type StatsCardsProps = {
  totalMessages: number;
  totalSessions: number;
  totalContacts: number;
};

const cards = [
  {
    key: "messages",
    label: "إجمالي الرسائل",
    color: "from-emerald-500/20 to-emerald-500/5",
    valueKey: "totalMessages",
  },
  {
    key: "sessions",
    label: "إجمالي الجلسات",
    color: "from-sky-500/20 to-sky-500/5",
    valueKey: "totalSessions",
  },
  {
    key: "contacts",
    label: "إجمالي جهات الاتصال",
    color: "from-amber-500/20 to-amber-500/5",
    valueKey: "totalContacts",
  },
] as const;

export function StatsCards({
  totalMessages,
  totalSessions,
  totalContacts,
}: StatsCardsProps) {
  const values = {
    totalMessages,
    totalSessions,
    totalContacts,
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.key}
          className={`rounded-xl border bg-gradient-to-br ${card.color} p-6 text-right shadow-sm`}
        >
          <p className="text-sm text-muted-foreground">{card.label}</p>
          <p className="mt-3 text-3xl font-bold">
            {values[card.valueKey].toLocaleString("ar")}
          </p>
        </div>
      ))}
    </div>
  );
}
