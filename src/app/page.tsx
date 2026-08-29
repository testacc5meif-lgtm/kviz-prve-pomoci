"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TOTAL_QUESTIONS } from "@/lib/questions";
import { MODE_CONFIG, ROUND_SIZE, normalizeName } from "@/lib/quiz";
import type { GameMode } from "@/lib/types";

const MODES = Object.entries(MODE_CONFIG) as [GameMode, (typeof MODE_CONFIG)[GameMode]][];

function RedCross({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <motion.rect
        x="38" y="8" width="24" height="84" rx="4" fill="var(--red)"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: "50% 50%" }}
      />
      <motion.rect
        x="8" y="38" width="84" height="24" rx="4" fill="var(--red)"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: "50% 50%" }}
      />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [ready, setReady] = useState(false);

  // localStorage postoji tek na klijentu. Citanje u inicijalizatoru state-a bi
  // razbilo hidraciju (server renderuje prazna polja), pa je efekat ispravan put.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      setName(localStorage.getItem("ck_name") ?? "");
      setTeam(localStorage.getItem("ck_team") ?? "");
    } catch {
      /* privatni prozor — samo krećemo od praznog */
    }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function start(e: React.FormEvent) {
    e.preventDefault();
    const clean = normalizeName(name);
    if (clean.length < 2) {
      setError("Upiši svoje ime i prezime (bar 2 slova).");
      return;
    }
    try {
      localStorage.setItem("ck_name", clean);
      localStorage.setItem("ck_team", normalizeName(team));
    } catch {
      /* nastavljamo i bez pamćenja */
    }
    setLeaving(true);
    setTimeout(() => router.push("/kviz"), 320);
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center px-5 py-10 sm:py-16">
      <AnimatePresence>
        {!leaving && (
          <motion.div
            className="flex w-full flex-col items-center"
            exit={{ opacity: 0, y: -24, filter: "blur(6px)" }}
            transition={{ duration: 0.3 }}
          >
            {/* ── Hero ── */}
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6"
            >
              <div className="relative">
                <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-[var(--red)]/25 blur-3xl" />
                <RedCross className="h-16 w-16 drop-shadow-[0_0_28px_rgba(239,43,61,0.55)] sm:h-20 sm:w-20" />
              </div>
            </motion.div>

            <motion.p
              initial={{ y: 12 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.25 }}
              className="mb-3 text-[11px] font-bold uppercase tracking-[0.32em] text-[var(--muted)]"
            >
              Crveni krst Mionica
            </motion.p>

            <motion.h1
              initial={{ y: 18 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.32, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="gradient-text text-center text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl"
            >
              Kviz prve pomoći
            </motion.h1>

            <motion.p
              initial={{ y: 14 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.42 }}
              className="mt-4 max-w-xl text-center text-[15px] leading-relaxed text-[var(--muted)] sm:text-base"
            >
              Trening za takmičare i volontere. {ROUND_SIZE} nasumičnih pitanja po rundi,
              izmešani ponuđeni odgovori i pet različitih režima igre — da se uči znanje,
              a ne redosled odgovora.
            </motion.p>

            {/* ── Brojke ── */}
            <motion.div
              initial={{ y: 14 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-7 flex flex-wrap items-center justify-center gap-2.5"
            >
              {[
                { v: TOTAL_QUESTIONS, l: "pitanja u bazi" },
                { v: ROUND_SIZE, l: "po rundi" },
                { v: MODES.length, l: "režima igre" },
              ].map((s) => (
                <div key={s.l} className="glass rounded-xl px-4 py-2.5 text-center">
                  <div className="tabular text-xl font-extrabold text-white">{s.v}</div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--faint)]">{s.l}</div>
                </div>
              ))}
            </motion.div>

            {/* ── Forma ── */}
            <motion.form
              onSubmit={start}
              initial={{ y: 26 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.58, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="glass glow-red mt-9 w-full max-w-md rounded-2xl p-6"
            >
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Ime i prezime <span className="text-[var(--red)]">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="npr. Marko Marković"
                autoComplete="name"
                maxLength={60}
                autoFocus={ready && !name}
                className="w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-base text-white outline-none transition placeholder:text-[var(--faint)] focus:border-[var(--red)] focus:ring-4 focus:ring-[var(--red)]/20"
              />

              <label className="mb-2 mt-4 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Ekipa / škola <span className="normal-case text-[var(--faint)]">(nije obavezno)</span>
              </label>
              <input
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="npr. OŠ Milan Rakić"
                maxLength={60}
                className="w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-base text-white outline-none transition placeholder:text-[var(--faint)] focus:border-[var(--red)] focus:ring-4 focus:ring-[var(--red)]/20"
              />

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 text-sm font-semibold text-[var(--red-soft)]"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.025 }}
                whileTap={{ scale: 0.97 }}
                className="group relative mt-6 w-full overflow-hidden rounded-xl bg-[var(--red)] px-6 py-4 text-base font-extrabold tracking-wide text-white shadow-[0_14px_40px_-12px_rgba(239,43,61,0.85)] transition hover:bg-[#ff3546]"
              >
                <span className="relative z-10">Započni kviz →</span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </motion.button>

              <p className="mt-3 text-center text-xs leading-relaxed text-[var(--faint)]">
                Tvoj rezultat se pamti pod ovim imenom, pa sledeći put dobijaš pitanja
                koja još nisi savladao.
              </p>
            </motion.form>

            {/* ── Režimi igre ── */}
            <motion.div
              initial={{ y: 10 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.75 }}
              className="mt-14 w-full"
            >
              <h2 className="mb-4 text-center text-xs font-bold uppercase tracking-[0.28em] text-[var(--muted)]">
                Režimi koji te čekaju
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {MODES.map(([id, cfg], i) => (
                  <motion.div
                    key={id}
                    initial={{ y: 18 }}
                    animate={{ y: 0 }}
                    transition={{ delay: 0.8 + i * 0.07 }}
                    whileHover={{ y: -5 }}
                    className="glass rounded-xl p-4"
                    style={{ borderColor: `${cfg.color}33` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cfg.emoji}</span>
                      <span className="font-extrabold" style={{ color: cfg.color }}>
                        {cfg.label}
                      </span>
                      <span className="tabular ml-auto rounded-md bg-white/8 px-1.5 py-0.5 text-[11px] font-bold text-[var(--muted)]">
                        {cfg.seconds}s
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{cfg.hint}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 10 }}
              animate={{ y: 0 }}
              transition={{ delay: 1.1 }}
              className="mt-12 flex flex-col items-center gap-3 pb-6"
            >
              <Link
                href="/admin"
                className="glass rounded-lg px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-white"
              >
                🔒 Istorija rezultata (za organizatore)
              </Link>
              <p className="max-w-md text-center text-[11px] leading-relaxed text-[var(--faint)]">
                Ovo je vežba za učenje, a ne zamena za obuku. Kod nekoliko pitanja su skenirane
                verzije testa protivrečne — takva pitanja nose napomenu posle odgovora.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
