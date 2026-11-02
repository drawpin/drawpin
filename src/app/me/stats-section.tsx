import type { ProfileStats } from "@/lib/profile";

/** The four numbers, as a definition list of small inked cards. */
export function StatsSection({ stats }: { stats: ProfileStats }) {
  const items = [
    { value: stats.drawings, label: "Drawings posted" },
    { value: stats.weeklyWins, label: "Weekly wins" },
    { value: stats.superWins, label: "Super wins" },
    { value: stats.boards, label: "Boards drawn on" },
  ];

  return (
    <section aria-label="Your numbers">
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="border-foreground flex flex-col-reverse gap-1 rounded-xl border-2 bg-white px-4 py-3.5 shadow-[4px_4px_0_var(--primary)]"
          >
            <dt className="text-muted-foreground text-sm font-semibold">
              {item.label}
            </dt>
            <dd className="text-4xl leading-none font-black tracking-tight">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
