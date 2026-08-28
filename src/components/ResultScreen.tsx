"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { TOPICS } from "@/lib/questions";
import { MODE_CONFIG, formatDuration, grade } from "@/lib/quiz";
import type { RoundQuestion } from "@/lib/types";

export type PlayedAnswer = {
  question: RoundQuestion;
  chosen: number | null;
  isCorrect: boolean;
  points: number;
  timeMs: number;
};

function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutExpo — brzo krene, meko stane
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(target * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

export function ResultScreen({
  answers,
  score,
  durationMs,
  bestStreak,
  progress,
  saved,
  busy,
  onRetryWrong,
  onNextRound,
  onHome,
}: {
  answers: PlayedAnswer[];
  score: number;
  durationMs: number;
  bestStreak: number;
  progress: { mastered: number; weak: number; total: number; roundsPlayed: number } | null;
  saved: boolean;
  busy: boolean;
  onRetryWrong: (ids: string[]) => void;
  onNextRound: () => void;
  onHome: () => void;
}) {
  const total = answers.length;
  const correct = answers.filter((a) => a.isCorrect).length;
  const percent = total ? Math.round((correct / total) * 1000) / 10 : 0;
  const g = grade(percent);

  const wrong = answers.filter((a) => !a.isCorrect);
  const wrongIds = wrong.map((a) => a.question.id);

  const shownScore = useCountUp(Math.max(0, score));
  const shownPercent = useCountUp(Math.round(percent), 1300);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    if (percent < 70) return;
    let cancelled = false;
    (async () => {
      const confetti = (await import("canvas-confetti")).default;
      if (cancelled) return;
      const colors = ["#ef2b3d", "#ffffff", "#fbbf24", "#22c55e"];
      confetti({ particleCount: 90, spread: 78, origin: { y: 0.35 }, colors });
      setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors }), 220);
      setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors }), 380);
    })();
    return () => {
      cancelled = true;
    };
  }, [percent]);

  const coverage = progress ? Math.round((progress.mastered / progress.total) * 100) : 0;
  const allDone = progress ? progress.mastered >= progress.total : false;

  const tiles = [
    { label: "Tačnih", value: `${correct}/${total}`, color: "var(--green)" },
    { label: "Najduži niz", value: `${bestStreak}${bestStreak >= 3 ? " 🔥" : ""}`, color: "var(--amber)" },
    { label: "Vreme", value: formatDuration(durationMs), color: "var(--cyan)" },
    { label: "Bodovi", value: String(Math.max(0, score)), color: "var(--violet)" },
  ];

  return (
    <motion.div
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      {/* ── Glavna kartica ── */}
      <div className="glass relative overflow-hidden rounded-2xl p-6 text-center sm:p-9">
        <div
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ background: `linear-gradient(90deg, transparent, ${g.color}, transparent)` }}
        />

        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 190, damping: 13, delay: 0.15 }}
          className="text-6xl sm:text-7xl"
        >
          {g.emoji}
        </motion.div>

        <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl" style={{ color: g.color }}>
          {g.label}
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--muted)]">{g.message}</p>

        <div className="tabular mt-6 flex items-end justify-center gap-2">
          <span className="text-6xl font-extrabold leading-none text-white sm:text-7xl">{shownPercent}</span>
          <span className="pb-1.5 text-2xl font-extrabold text-[var(--muted)]">%</span>
        </div>
        <div className="tabular mt-1 text-sm font-bold text-[var(--muted)]">
          {shownScore} bodova
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {tiles.map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ y: 16 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.35 + i * 0.08 }}
              className="rounded-xl border border-[var(--border)] bg-black/25 px-3 py-3"
            >
              <div className="tabular text-lg font-extrabold" style={{ color: t.color }}>
                {t.value}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--faint)]">{t.label}</div>
            </motion.div>
          ))}
        </div>

        {!saved && (
          <p className="mt-4 rounded-lg border border-[var(--amber)]/30 bg-[var(--amber)]/10 px-3 py-2 text-xs text-[#fde68a]">
            Rezultat nije sačuvan u bazu (baza trenutno nije dostupna). Tvoj rezultat na ekranu je ispravan.
          </p>
        )}
      </div>

      {/* ── Ukupan napredak ── */}
      {progress && (
        <motion.div
          initial={{ y: 18 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass mt-4 rounded-2xl p-5"
        >
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Tvoj ukupan napredak
              </div>
              <div className="tabular mt-1 text-2xl font-extrabold text-white">
                {progress.mastered} <span className="text-base text-[var(--muted)]">/ {progress.total} pitanja</span>
              </div>
            </div>
            <div className="tabular text-3xl font-extrabold" style={{ color: allDone ? "var(--amber)" : "var(--green)" }}>
              {coverage}%
            </div>
          </div>

          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${coverage}%`,
                background: allDone
                  ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
                  : "linear-gradient(90deg,#22c55e,#4ade80)",
              }}
            />
          </div>

          <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--muted)]">
            {allDone
              ? "🏅 Prošao/la si celu bazu pitanja! Nastavi da vežbaš — pitanja sada dolaze u novom rasporedu."
              : `Ostalo je još ${progress.total - progress.mastered} pitanja koja nisi savladao/la. Odigrano rundi: ${progress.roundsPlayed}.`}
          </p>
        </motion.div>
      )}

      {/* ── Dugmad ── */}
      <motion.div
        initial={{ y: 18 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-4 space-y-2.5"
      >
        {wrongIds.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            disabled={busy}
            onClick={() => onRetryWrong(wrongIds)}
            className="w-full rounded-xl border-2 border-[var(--amber)] bg-[var(--amber)]/12 px-6 py-4 text-base font-extrabold text-[var(--amber)] transition hover:bg-[var(--amber)]/20 disabled:opacity-50"
          >
            🎯 Ponovi {wrongIds.length} {wrongIds.length === 1 ? "pitanje" : "pitanja"} koja nisi znao/la
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          disabled={busy}
          onClick={onNextRound}
          className="group relative w-full overflow-hidden rounded-xl bg-[var(--red)] px-6 py-4 text-base font-extrabold text-white shadow-[0_14px_40px_-12px_rgba(239,43,61,0.85)] transition hover:bg-[#ff3546] disabled:opacity-50"
        >
          <span className="relative z-10">
            {busy ? "Pripremam…" : allDone ? "Još jedna runda →" : "Nastavi — sledeća runda pitanja →"}
          </span>
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        </motion.button>

        <div className="flex gap-2.5">
          <button
            onClick={() => setShowReview((v) => !v)}
            className="glass flex-1 rounded-xl px-4 py-3 text-sm font-bold text-[var(--muted)] transition hover:text-white"
          >
            {showReview ? "Sakrij pregled" : `Pregled svih ${total} pitanja`}
          </button>
          <button
            onClick={onHome}
            className="glass flex-1 rounded-xl px-4 py-3 text-sm font-bold text-[var(--muted)] transition hover:text-white"
          >
            Završi
          </button>
        </div>
      </motion.div>

      {/* ── Pregled ── */}
      <AnimatePresence>
        {showReview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-2.5">
              {answers.map((a, i) => {
                const q = a.question;
                const topic = TOPICS[q.topic];
                return (
                  <div
                    key={`${q.id}-${i}`}
                    className={`glass rounded-xl border-l-4 p-4 ${
                      a.isCorrect ? "border-l-[var(--green)]" : "border-l-[var(--red)]"
                    }`}
                  >
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
                      <span className="tabular text-[var(--faint)]">#{i + 1}</span>
                      <span style={{ color: topic.color }}>
                        {topic.emoji} {topic.short}
                      </span>
                      <span className="text-[var(--faint)]">{MODE_CONFIG[q.mode].emoji}</span>
                      <span className={`tabular ml-auto ${a.points >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {a.points > 0 ? "+" : ""}
                        {a.points}
                      </span>
                    </div>

                    <p className="text-sm font-bold leading-snug text-white">{q.text}</p>

                    {!a.isCorrect && (
                      <p className="mt-2 text-[13px] text-[var(--red-soft)]">
                        <span className="font-bold">Tvoj odgovor: </span>
                        {a.chosen === null ? "(isteklo vreme)" : q.options[a.chosen]}
                      </p>
                    )}
                    <p className="mt-1 text-[13px] text-[var(--green-soft)]">
                      <span className="font-bold">Tačno: </span>
                      {q.options[q.correct]}
                    </p>

                    {q.note && (
                      <p className="mt-2 rounded-lg border border-[var(--amber)]/25 bg-[var(--amber)]/8 px-3 py-2 text-[12px] leading-relaxed text-[#fde68a]">
                        <span className="font-bold">Napomena: </span>
                        {q.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
