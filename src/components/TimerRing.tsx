"use client";

import { motion } from "motion/react";

/**
 * Prsten koji se prazni kako vreme prolazi.
 *
 * `relaxed` (petlići) — sat i dalje odbrojava, ali pitanje ne ističe, pa nema
 * crvenog pulsiranja ni panike: boje ostaju mirne, a na nuli stoji smajli.
 */
export function TimerRing({
  fraction,
  secondsLeft,
  relaxed = false,
  size = 56,
}: {
  fraction: number;
  secondsLeft: number;
  relaxed?: boolean;
  size?: number;
}) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(1, fraction));

  const color = relaxed
    ? safe > 0.25
      ? "#38bdf8"
      : "#a78bfa"
    : safe > 0.5
      ? "#22c55e"
      : safe > 0.25
        ? "#fbbf24"
        : "#ef2b3d";

  const urgent = !relaxed && safe <= 0.25;
  const istekao = relaxed && secondsLeft <= 0;

  return (
    <div
      className={`relative ${urgent ? "urgent" : ""} rounded-full`}
      style={{ width: size, height: size }}
      title={relaxed ? "Nema žurbe — pitanje te čeka" : undefined}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - safe)}
          style={{ transition: "stroke-dashoffset 120ms linear, stroke 300ms ease" }}
        />
      </svg>

      <motion.span
        key={istekao ? "smajli" : secondsLeft}
        initial={urgent ? { scale: 1.35 } : false}
        animate={{ scale: 1 }}
        transition={{ duration: 0.25 }}
        className="tabular absolute inset-0 flex items-center justify-center text-base font-extrabold"
        style={{ color }}
      >
        {istekao ? "🙂" : secondsLeft}
      </motion.span>
    </div>
  );
}
