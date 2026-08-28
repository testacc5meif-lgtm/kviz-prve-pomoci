"use client";

import { AnimatePresence, motion } from "motion/react";
import { TOPICS } from "@/lib/questions";
import { MODE_CONFIG } from "@/lib/quiz";
import type { RoundQuestion } from "@/lib/types";

const LETTERS = ["A", "B", "V"];

export type Verdict = { chosen: number | null; points: number } | null;

export function QuestionCard({
  question,
  index,
  total,
  verdict,
  eliminated,
  onAnswer,
}: {
  question: RoundQuestion;
  index: number;
  total: number;
  verdict: Verdict;
  eliminated: number | null;
  onAnswer: (choice: number) => void;
}) {
  const topic = TOPICS[question.topic];
  const mode = MODE_CONFIG[question.mode];
  const answered = verdict !== null;
  const timedOut = answered && verdict.chosen === null;

  return (
    <motion.div
      key={question.id}
      initial={{ y: 34, scale: 0.97 }}
      animate={{ y: 0, scale: 1 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      <div className="glass relative overflow-hidden rounded-2xl p-5 sm:p-7">
        {/* Traka u boji režima */}
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: `linear-gradient(90deg, transparent, ${mode.color}, transparent)` }}
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className="rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide"
            style={{ background: `${topic.color}1f`, color: topic.color }}
          >
            {topic.emoji} {topic.short}
          </span>
          <span
            className="rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide"
            style={{ background: `${mode.color}1f`, color: mode.color }}
          >
            {mode.emoji} {mode.label}
          </span>
          <span className="tabular ml-auto text-[11px] font-bold text-[var(--faint)]">
            {index + 1} / {total}
          </span>
        </div>

        {question.visual && (
          <motion.div
            initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ delay: 0.12, type: "spring", stiffness: 220, damping: 14 }}
            className="mb-4 flex justify-center"
          >
            <div className="glass flex h-24 w-24 items-center justify-center rounded-2xl text-5xl">
              {question.visual}
            </div>
          </motion.div>
        )}

        <h2 className="text-[17px] font-bold leading-snug text-white sm:text-xl">{question.text}</h2>

        <div className="mt-5 space-y-2.5">
          {question.options.map((opt, i) => {
            const isCorrect = i === question.correct;
            const isChosen = answered && verdict.chosen === i;
            const isGone = eliminated === i && !answered;

            let cls =
              "border-[var(--border)] bg-white/[0.03] hover:border-[var(--border-strong)] hover:bg-white/[0.07]";
            if (answered && isCorrect) cls = "border-[var(--green)] bg-[var(--green)]/15";
            else if (isChosen) cls = "border-[var(--red)] bg-[var(--red)]/15";
            else if (answered) cls = "border-[var(--border)] bg-white/[0.02] opacity-45";

            return (
              <motion.button
                key={i}
                type="button"
                disabled={answered || isGone}
                onClick={() => onAnswer(i)}
                whileHover={answered || isGone ? undefined : { x: 5 }}
                whileTap={answered || isGone ? undefined : { scale: 0.985 }}
                /* Vizuelni znak eliminacije ide kroz CSS, ne kroz JS animaciju —
                   da se prikaz poklopi sa stvarnim stanjem i kad pregledac pauzira animacije. */
                className={`group flex w-full items-start gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all duration-300 ${cls} ${
                  isGone ? "opacity-20 grayscale" : ""
                } ${isChosen && !isCorrect ? "shake" : ""} disabled:cursor-default`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-extrabold transition ${
                    answered && isCorrect
                      ? "bg-[var(--green)] text-black"
                      : isChosen
                        ? "bg-[var(--red)] text-white"
                        : "bg-white/10 text-[var(--muted)] group-hover:bg-white/20"
                  }`}
                >
                  {answered && isCorrect ? "✓" : isChosen ? "✕" : LETTERS[i] ?? i + 1}
                </span>
                <span className="text-[14px] font-medium leading-snug text-white sm:text-[15px]">{opt}</span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {answered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex items-center gap-2 text-sm font-extrabold">
                {timedOut ? (
                  <span className="text-[var(--amber)]">⏱ Isteklo vreme — tačan odgovor je označen zeleno.</span>
                ) : verdict.chosen === question.correct ? (
                  <span className="text-[var(--green-soft)]">✓ Tačno!</span>
                ) : (
                  <span className="text-[var(--red-soft)]">✕ Netačno — tačan odgovor je označen zeleno.</span>
                )}
              </div>

              {question.note && (
                <div className="mt-3 rounded-xl border border-[var(--amber)]/30 bg-[var(--amber)]/10 px-4 py-3 text-[13px] leading-relaxed text-[#fde68a]">
                  <span className="font-extrabold">Napomena: </span>
                  {question.note}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
