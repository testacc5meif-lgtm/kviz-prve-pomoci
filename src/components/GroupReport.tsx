"use client";

import { useState } from "react";
import { Bar, Tile, accColor } from "@/components/adminUi";
import type { PlayerDetail } from "@/lib/stats";

/** Jedno pitanje posmatrano na nivou cele grupe. */
type GroupQuestion = {
  questionId: string;
  text: string;
  topicLabel: string;
  emoji: string;
  color: string;
  correctText: string;
  /** Koliko članova grupe ovo pitanje I DALJE ne zna. */
  stillWrong: number;
  /** Ukupan broj promašaja u grupi (isti član može promašiti više puta). */
  totalMisses: number;
  who: { name: string; chosenText: string | null; times: number; stillWrong: boolean }[];
};

/**
 * Zajednički izveštaj za označene takmičare: kako grupa stoji ukupno,
 * koje oblasti im najslabije idu i koja pitanja grupa ne zna — sa spiskom
 * ko je šta izabrao.
 */
export function GroupReport({ detail, bank }: { detail: PlayerDetail[]; bank: number }) {
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [samoNeznanje, setSamoNeznanje] = useState(true);
  /** Prikazujemo u porcijama — inače bi spisak od 50+ pitanja razvukao stranu. */
  const [koliko, setKoliko] = useState(12);

  const fullRounds = detail.flatMap((d) => d.sessions).filter((s) => s.kind === "round");
  const avg = fullRounds.length
    ? Math.round((fullRounds.reduce((a, s) => a + s.percent, 0) / fullRounds.length) * 10) / 10
    : 0;
  const avgCoverage = detail.length
    ? Math.round((detail.reduce((a, d) => a + d.coverage, 0) / detail.length) * 10) / 10
    : 0;

  // Oblasti saberemo preko cele grupe.
  const topicAgg = new Map<
    string,
    { label: string; emoji: string; color: string; asked: number; correct: number }
  >();
  for (const d of detail) {
    for (const tp of d.topics) {
      const cur =
        topicAgg.get(tp.topic) ?? { label: tp.label, emoji: tp.emoji, color: tp.color, asked: 0, correct: 0 };
      cur.asked += tp.asked;
      cur.correct += tp.correct;
      topicAgg.set(tp.topic, cur);
    }
  }
  const topics = [...topicAgg]
    .map(([id, v]) => ({ id, ...v, accuracy: v.asked ? Math.round((v.correct / v.asked) * 1000) / 10 : 0 }))
    .sort((a, b) => a.accuracy - b.accuracy);

  // Pitanja grupišemo po ID-u — tako se vidi ŠTA je celoj grupi zajednički problem.
  const qAgg = new Map<string, GroupQuestion>();
  for (const d of detail) {
    for (const m of d.mistakes) {
      const cur =
        qAgg.get(m.questionId) ??
        ({
          questionId: m.questionId,
          text: m.text,
          topicLabel: m.topicLabel,
          emoji: m.emoji,
          color: m.color,
          correctText: m.correctText,
          stillWrong: 0,
          totalMisses: 0,
          who: [],
        } as GroupQuestion);

      cur.totalMisses += m.times;
      if (m.stillWrong) cur.stillWrong += 1;
      cur.who.push({ name: d.name, chosenText: m.chosenText, times: m.times, stillWrong: m.stillWrong });
      qAgg.set(m.questionId, cur);
    }
  }

  const sve = [...qAgg.values()].sort(
    (a, b) => b.stillWrong - a.stillWrong || b.totalMisses - a.totalMisses || b.who.length - a.who.length
  );
  const josNeznaju = sve.filter((q) => q.stillWrong > 0);
  const pitanja = samoNeznanje ? josNeznaju : sve;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="U grupi" value={String(detail.length)} sub="označenih takmičara" color="var(--amber)" />
        <Tile label="Odigranih rundi" value={String(fullRounds.length)} sub="zajedno" color="var(--cyan)" />
        <Tile label="Prosek grupe" value={`${avg}%`} color={accColor(avg)} />
        <Tile
          label="Prosečna pokrivenost"
          value={`${avgCoverage}%`}
          sub={`od ${bank} pitanja`}
          color="var(--violet)"
        />
      </div>

      {topics.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[var(--muted)]">
            Šta grupi najslabije ide
          </h3>
          <div className="space-y-3">
            {topics.map((tp) => (
              <div key={tp.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-white">
                    {tp.emoji} {tp.label}
                  </span>
                  <span className="tabular text-[var(--muted)]">
                    {tp.correct}/{tp.asked} · <span style={{ color: accColor(tp.accuracy) }}>{tp.accuracy}%</span>
                  </span>
                </div>
                <Bar value={tp.accuracy} color={tp.color} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-5">
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--muted)]">
            Pitanja koja grupa ne zna
          </h3>
          <button
            onClick={() => {
              setSamoNeznanje((v) => !v);
              setKoliko(12);
            }}
            className={`ml-auto rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              samoNeznanje ? "bg-[var(--red)] text-white" : "bg-white/8 text-[var(--muted)] hover:text-white"
            }`}
          >
            {samoNeznanje ? `Samo ono što još ne znaju (${josNeznaju.length})` : `Sve greške (${sve.length})`}
          </button>
        </div>
        <p className="mb-4 text-[13px] text-[var(--muted)]">
          Sortirano po tome koliko članova grupe pitanje i dalje ne zna. Klikni na pitanje da vidiš ko je šta izabrao.
        </p>

        {pitanja.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            {sve.length === 0
              ? "Grupa nema nijednu grešku u izabranom periodu. 👏"
              : "Sve ranije greške su u međuvremenu ispravljene. 👏"}
          </p>
        ) : (
          <div className="space-y-2">
            {pitanja.slice(0, koliko).map((q) => {
              const otvoreno = openQ === q.questionId;
              return (
                <div
                  key={q.questionId}
                  className={`rounded-xl border-l-4 bg-white/[0.03] ${
                    q.stillWrong > 0 ? "border-l-[var(--red)]" : "border-l-[var(--green)]"
                  }`}
                >
                  <button onClick={() => setOpenQ(otvoreno ? null : q.questionId)} className="w-full p-3 text-left">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
                      <span style={{ color: q.color }}>
                        {q.emoji} {q.topicLabel}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 ${
                          q.stillWrong > 0
                            ? "bg-[var(--red)]/20 text-[var(--red-soft)]"
                            : "bg-[var(--green)]/20 text-[var(--green-soft)]"
                        }`}
                      >
                        {q.stillWrong > 0 ? `${q.stillWrong} od ${detail.length} još ne zna` : "svi naučili"}
                      </span>
                      {q.totalMisses > q.who.length && (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[var(--muted)]">
                          {q.totalMisses} promašaja ukupno
                        </span>
                      )}
                      <span className="ml-auto text-[var(--faint)]">{otvoreno ? "▾" : "▸"}</span>
                    </div>

                    <p className="text-sm font-bold leading-snug text-white">{q.text}</p>
                    <p className="mt-1 text-[13px] text-[var(--green-soft)]">
                      <span className="font-bold">Tačno: </span>
                      {q.correctText}
                    </p>
                  </button>

                  {otvoreno && (
                    <div className="border-t border-white/10 px-3 pb-3 pt-2">
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--faint)]">
                        Ko je promašio i šta je izabrao
                      </div>
                      <div className="space-y-1.5">
                        {q.who.map((w) => (
                          <div key={w.name} className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                            <span className="font-bold text-white">{w.name}</span>
                            {w.times > 1 && <span className="text-[11px] text-[var(--faint)]">{w.times}×</span>}
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                w.stillWrong
                                  ? "bg-[var(--red)]/20 text-[var(--red-soft)]"
                                  : "bg-[var(--green)]/20 text-[var(--green-soft)]"
                              }`}
                            >
                              {w.stillWrong ? "još ne zna" : "naučio/la"}
                            </span>
                            <span className="text-[var(--red-soft)]">{w.chosenText ?? "(isteklo vreme)"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pitanja.length > koliko && (
          <button
            onClick={() => setKoliko((n) => n + 20)}
            className="mt-3 w-full rounded-xl border border-[var(--border)] bg-white/[0.03] px-4 py-2.5 text-sm font-bold text-[var(--muted)] transition hover:text-white"
          >
            Prikaži još ({pitanja.length - koliko} preostalo)
          </button>
        )}
      </div>
    </div>
  );
}
