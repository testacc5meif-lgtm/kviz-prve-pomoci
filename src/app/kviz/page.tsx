"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { QuestionCard, type Verdict } from "@/components/QuestionCard";
import { ResultScreen, type PlayedAnswer } from "@/components/ResultScreen";
import { TimerRing } from "@/components/TimerRing";
import { ELIMINATION_AFTER, MODE_CONFIG, scoreAnswer, streakMultiplier } from "@/lib/quiz";
import type { RoundKind, RoundQuestion } from "@/lib/types";

type Phase = "loading" | "countdown" | "playing" | "finished" | "error";

type Progress = { mastered: number; weak: number; total: number; roundsPlayed: number };

/** Koliko se zadržavamo na povratnoj informaciji pre sledećeg pitanja. */
const FEEDBACK_MS = 1700;
const FEEDBACK_WITH_NOTE_MS = 4200;
/** Trajanje izlazne + ulazne animacije kartice — za toliko kasnimo sa startom sata,
 *  da igraču ne curi vreme dok se pitanje još pojavljuje na ekranu. */
const CARD_TRANSITION_MS = 400;

export default function KvizPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");

  const [round, setRound] = useState<RoundQuestion[]>([]);
  const [token, setToken] = useState("");
  const [kind, setKind] = useState<RoundKind>("round");

  const [index, setIndex] = useState(0);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [eliminated, setEliminated] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const [played, setPlayed] = useState<PlayedAnswer[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [pop, setPop] = useState<{ id: number; points: number } | null>(null);

  const [durationMs, setDurationMs] = useState(0);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [saved, setSaved] = useState(true);
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(3);

  /** Index pitanja koje je vec odgovoreno — brava koja radi odmah, bez cekanja re-rendera. */
  const answeredIndex = useRef(-1);
  const questionStart = useRef(0);
  const roundStart = useRef(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = round[index];
  const msTotal = current ? MODE_CONFIG[current.mode].seconds * 1000 : 1;
  const msLeft = Math.max(0, msTotal - elapsed);

  /* ── učitavanje igrača ── */
  // localStorage postoji tek na klijentu — server ne zna ime igraca, pa citanje
  // mora u efekat da hidracija ne bi pukla.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let storedName = "";
    let storedTeam = "";
    try {
      storedName = localStorage.getItem("ck_name") ?? "";
      storedTeam = localStorage.getItem("ck_team") ?? "";
    } catch {
      /* privatni prozor */
    }
    if (!storedName) {
      router.replace("/");
      return;
    }
    setName(storedName);
    setTeam(storedTeam);
  }, [router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* ── dohvatanje runde ── */
  const loadRound = useCallback(
    async (opts: { kind: RoundKind; only?: string[] }) => {
      if (!name) return;
      setBusy(true);
      setPhase("loading");
      setError("");
      try {
        const res = await fetch("/api/round", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, team, kind: opts.kind, only: opts.only }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Runda nije mogla da se pripremi.");

        setRound(data.questions as RoundQuestion[]);
        setToken(data.token as string);
        setKind(opts.kind);
        setProgress(data.progress as Progress);
        setIndex(0);
        setVerdict(null);
        setEliminated(null);
        setElapsed(0);
        setPlayed([]);
        answeredIndex.current = -1;
        setScore(0);
        setStreak(0);
        setBestStreak(0);
        setSaved(true);
        setCountdown(3);
        setPhase("countdown");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Došlo je do greške.");
        setPhase("error");
      } finally {
        setBusy(false);
      }
    },
    [name, team]
  );

  // Ref cuva od dvostrukog dohvatanja (React StrictMode u razvoju pokrece efekte dvaput).
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (!name || bootstrapped.current) return;
    bootstrapped.current = true;
    void loadRound({ kind: "round" });
  }, [name, loadRound]);

  /* ── odbrojavanje pred start: 3 … 2 … 1 … KRENI ── */
  useEffect(() => {
    if (phase !== "countdown") return;
    const timers = [1, 2, 3].map((n) => setTimeout(() => setCountdown(3 - n), n * 750));
    timers.push(
      setTimeout(() => {
        roundStart.current = Date.now();
        questionStart.current = Date.now() + CARD_TRANSITION_MS;
        answeredIndex.current = -1;
        setElapsed(0);
        setVerdict(null);
        setEliminated(null);
        setPhase("playing");
      }, 3 * 750 + 450)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const finishAnswer = useCallback(
    (choice: number | null) => {
      if (!current || verdict !== null) return;

      if (answeredIndex.current === index) return;
      answeredIndex.current = index;

      const spent = Math.max(0, Math.min(msTotal, Date.now() - questionStart.current));
      const isCorrect = choice !== null && choice === current.correct;
      const points = scoreAnswer({
        mode: current.mode,
        isCorrect,
        msLeft: msTotal - spent,
        msTotal,
        streakBefore: streak,
        eliminationUsed: current.mode === "elimination" && spent >= ELIMINATION_AFTER * 1000,
      });

      setVerdict({ chosen: choice, points });
      setScore((s) => s + points);
      // Upisujemo NA MESTO pitanja, ne na kraj niza — tako je nemoguce dobiti
      // vise odgovora nego sto runda ima pitanja.
      setPlayed((p) => {
        const next = p.slice();
        next[index] = { question: current, chosen: choice, isCorrect, points, timeMs: spent };
        return next;
      });
      setPop({ id: Date.now(), points });

      if (isCorrect) {
        setStreak((s) => {
          const next = s + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
      } else {
        setStreak(0);
      }
    },
    [current, verdict, msTotal, streak, index]
  );

  // Sat drzimo u refu da interval ne mora da se pravi iznova na svaku promenu bodova.
  const finishRef = useRef(finishAnswer);
  useEffect(() => {
    finishRef.current = finishAnswer;
  }, [finishAnswer]);

  /* ── jedan sat po pitanju: vreme, eliminacija i istek ──
     Vreme se racuna iz questionStart, a NE iz state-a `elapsed` — inace bi
     zastarela vrednost sa prethodnog pitanja odmah oborila sledece. */
  useEffect(() => {
    if (phase !== "playing" || verdict !== null || !current) return;
    const total = MODE_CONFIG[current.mode].seconds * 1000;

    const tick = () => {
      const spent = Math.max(0, Date.now() - questionStart.current);
      setElapsed(spent);

      if (current.mode === "elimination" && spent >= ELIMINATION_AFTER * 1000) {
        setEliminated((prev) => {
          if (prev !== null) return prev;
          const wrongIdx = current.options.map((_, i) => i).filter((i) => i !== current.correct);
          return wrongIdx[Math.floor(Math.random() * wrongIdx.length)];
        });
      }

      if (spent >= total) finishRef.current(null);
    };

    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [phase, verdict, current, index]);

  // Reset za sledece pitanje radimo ovde (u dogadjaju), a ne u efektu na promenu indeksa.
  const goNext = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;

    if (index + 1 >= round.length) {
      setDurationMs(Date.now() - roundStart.current);
      setPhase("finished");
      return;
    }

    questionStart.current = Date.now() + CARD_TRANSITION_MS;
    setElapsed(0);
    setVerdict(null);
    setEliminated(null);
    setIndex((i) => i + 1);
  }, [index, round.length]);

  /* ── automatski prelaz posle odgovora ── */
  useEffect(() => {
    if (phase !== "playing" || verdict === null || !current) return;
    const wait = current.note ? FEEDBACK_WITH_NOTE_MS : FEEDBACK_MS;
    advanceTimer.current = setTimeout(goNext, wait);
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [verdict, phase, current, goNext]);

  /* ── slanje rezultata ── */
  useEffect(() => {
    if (phase !== "finished" || played.length === 0 || !token) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            name,
            team,
            startedAt: roundStart.current,
            answers: Array.from({ length: round.length }, (_, i) => ({
              chosen: played[i]?.chosen ?? null,
              timeMs: played[i]?.timeMs ?? 0,
              points: played[i]?.points ?? 0,
            })),
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setSaved(false);
          return;
        }
        setSaved(Boolean(data.saved));
        if (data.progress) setProgress(data.progress as Progress);
      } catch {
        if (!cancelled) setSaved(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [phase, played, token, name, team, round.length]);

  /* ── tastatura ── */
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (verdict !== null) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goNext();
        }
        return;
      }
      const map: Record<string, number> = { "1": 0, "2": 1, "3": 2, a: 0, b: 1, v: 2 };
      const idx = map[e.key.toLowerCase()];
      if (idx !== undefined && current && idx < current.options.length && eliminated !== idx) {
        finishAnswer(idx);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, verdict, current, eliminated, finishAnswer, goNext]);

  /* ── upozorenje na napuštanje ── */
  useEffect(() => {
    if (phase !== "playing") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  function quit() {
    if (played.length > 0 && !confirm("Prekinuti kviz? Rezultat ove runde neće biti sačuvan.")) return;
    router.push("/");
  }

  /* ─────────────────────── prikaz ─────────────────────── */

  if (phase === "loading") {
    return (
      <main key="loading" className="flex min-h-dvh items-center justify-center px-5">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
            className="mx-auto h-11 w-11 rounded-full border-4 border-white/10 border-t-[var(--red)]"
          />
          <p className="mt-4 text-sm font-semibold text-[var(--muted)]">Pripremam pitanja…</p>
        </div>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main key="error" className="flex min-h-dvh items-center justify-center px-5">
        <div className="glass max-w-sm rounded-2xl p-7 text-center">
          <div className="text-4xl">⚠️</div>
          <h2 className="mt-3 text-lg font-extrabold text-white">Nešto nije u redu</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{error}</p>
          <button
            onClick={() => loadRound({ kind: "round" })}
            className="mt-5 w-full rounded-xl bg-[var(--red)] px-5 py-3 font-extrabold text-white"
          >
            Pokušaj ponovo
          </button>
          <button
            onClick={() => router.push("/")}
            className="mt-2 w-full rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-bold text-[var(--muted)]"
          >
            Nazad na početak
          </button>
        </div>
      </main>
    );
  }

  if (phase === "countdown") {
    return (
      <main key="countdown" className="flex min-h-dvh flex-col items-center justify-center px-5">
        <p className="mb-6 text-sm font-bold uppercase tracking-[0.3em] text-[var(--muted)]">
          {kind === "retry" ? "Popravni krug" : `Runda ${(progress?.roundsPlayed ?? 0) + 1}`}
        </p>
        <motion.div
          key={countdown}
          initial={{ scale: 0.35, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="gradient-text text-8xl font-extrabold sm:text-9xl"
        >
          {countdown > 0 ? countdown : "KRENI!"}
        </motion.div>
        <p className="mt-8 text-center text-sm text-[var(--muted)]">
          {round.length} pitanja • odgovaraj tasterima 1/2/3 ili klikom
        </p>
      </main>
    );
  }

  if (phase === "finished") {
    return (
      <main key="finished" className="mx-auto w-full max-w-2xl px-5 py-8 sm:py-12">
        <ResultScreen
          answers={played.filter(Boolean)}
          score={score}
          durationMs={durationMs}
          bestStreak={bestStreak}
          progress={progress}
          saved={saved}
          busy={busy}
          onRetryWrong={(ids) => loadRound({ kind: "retry", only: ids })}
          onNextRound={() => loadRound({ kind: "round" })}
          onHome={() => router.push("/")}
        />
      </main>
    );
  }

  const mult = streakMultiplier(streak);

  return (
    <main key="playing" className="mx-auto w-full max-w-2xl px-5 py-5 sm:py-8">
      {/* ── HUD ── */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={quit}
            aria-label="Prekini kviz"
            className="glass flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:text-white"
          >
            ✕
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-bold text-white">{name}</span>
              <div className="relative flex shrink-0 items-center gap-2">
                {streak >= 3 && (
                  <span className="flame text-xs font-extrabold text-[var(--amber)]">
                    🔥 {streak}× · {mult}×
                  </span>
                )}
                <span className="tabular text-sm font-extrabold text-white">{Math.max(0, score)}</span>
                <AnimatePresence>
                  {pop && (
                    <motion.span
                      key={pop.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onAnimationComplete={() => setPop(null)}
                      className={`float-score pointer-events-none absolute -top-1 right-0 text-sm font-extrabold ${
                        pop.points > 0 ? "text-[var(--green-soft)]" : "text-[var(--red-soft)]"
                      }`}
                    >
                      {pop.points > 0 ? "+" : ""}
                      {pop.points}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--red)] to-[var(--red-soft)] transition-[width] duration-500 ease-out"
                style={{ width: `${((index + (verdict ? 1 : 0)) / round.length) * 100}%` }}
              />
            </div>
          </div>

          <TimerRing
            fraction={msLeft / msTotal}
            secondsLeft={Math.ceil(msLeft / 1000)}
          />
        </div>
      </div>

      {current && (
        <QuestionCard
          key={`${current.id}-${index}`}
          question={current}
          index={index}
          total={round.length}
          verdict={verdict}
          eliminated={eliminated}
          onAnswer={finishAnswer}
        />
      )}

      <AnimatePresence>
        {verdict !== null && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={goNext}
            className="mt-4 w-full rounded-xl border-2 border-[var(--border-strong)] bg-white/5 px-6 py-3.5 text-sm font-extrabold text-white transition hover:bg-white/10"
          >
            {index + 1 >= round.length ? "Vidi rezultat →" : "Dalje →"}
          </motion.button>
        )}
      </AnimatePresence>

      <p className="mt-4 text-center text-[11px] text-[var(--faint)]">
        Prečice: <span className="font-bold">1 / 2 / 3</span> za odgovor,{" "}
        <span className="font-bold">Enter</span> za dalje
      </p>
    </main>
  );
}
