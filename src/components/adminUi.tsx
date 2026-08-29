"use client";

/** Sitni delovi koje dele admin strana i izveštaj grupe. */

export function accColor(v: number) {
  return v >= 80 ? "var(--green)" : v >= 60 ? "var(--amber)" : "var(--red)";
}

export function dt(iso: string) {
  return new Date(iso).toLocaleString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Bar({ value, color = "var(--green)" }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full min-w-[70px] overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
      />
    </div>
  );
}

export function Tile({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--faint)]">{label}</div>
      <div className="tabular mt-1 text-2xl font-extrabold" style={{ color: color ?? "#fff" }}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-[var(--muted)]">{sub}</div>}
    </div>
  );
}
