"use client";

import { motion } from "motion/react";

/** Prsten koji se prazni kako vreme ističe. Boja ide zelena → žuta → crvena. */
export function TimerRing({
  fraction,
  secondsLeft,
  size = 56,
}: {
  fraction: number;
  secondsLeft: number;
  size?: number;
}) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(1, fraction));

  const color = safe > 0.5 ? "#22c55e" : safe > 0.25 ? "#fbbf24" : "#ef2b3d";
  const urgent = safe <= 0.25;

  return (
    <div className={`relative ${urgent ? "urgent" : ""} rounded-full`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
        />
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
        key={secondsLeft}
        initial={urgent ? { scale: 1.35 } : false}
        animate={{ scale: 1 }}
        transition={{ duration: 0.25 }}
        className="tabular absolute inset-0 flex items-center justify-center text-base font-extrabold"
        style={{ color }}
      >
        {secondsLeft}
      </motion.span>
    </div>
  );
}
