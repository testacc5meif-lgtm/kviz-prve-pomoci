"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { GroupReport } from "@/components/GroupReport";
import { Bar, Tile, accColor, dt } from "@/components/adminUi";
import { formatDuration } from "@/lib/quiz";
import type { AdminStats, PlayerDetail } from "@/lib/stats";

type Tab = "pregled" | "grupa" | "takmicari" | "sesije" | "pitanja" | "analiza";

type Roster = { key: string; name: string; team: string };
type Stats = AdminStats & { roster: Roster[]; unfilteredSessions: number };

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "pregled", label: "Pregled", emoji: "📊" },
  { id: "grupa", label: "Moja grupa", emoji: "⭐" },
  { id: "takmicari", label: "Svi takmičari", emoji: "🧑‍🤝‍🧑" },
  { id: "sesije", label: "Sve runde", emoji: "🗓" },
  { id: "pitanja", label: "Pitanja", emoji: "❓" },
  { id: "analiza", label: "Analiza", emoji: "🔬" },
];

const WATCH_KEY = "ck_pracene_osobe";

function isoDay(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ─────────────────── detaljna kartica jednog takmičara ─────────────────── */

function DetailCard({ d, bank }: { d: PlayerDetail; bank: number }) {
  // Sklopljeno po difoltu — grupa moze imati 6+ ljudi, pa se strana ne razvlaci.
  const [open, setOpen] = useState(false);
  const rounds = d.sessions.filter((s) => s.kind === "round");
  const best = d.sessions.reduce((m, s) => Math.max(m, s.percent), 0);
  const avg = rounds.length
    ? Math.round((rounds.reduce((a, s) => a + s.percent, 0) / rounds.length) * 10) / 10
    : 0;
  const stillWrong = d.mistakes.filter((m) => m.stillWrong);

  return (
    <div className="glass rounded-2xl p-4">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 text-left">
        <div className="min-w-0 flex-1">
          <div className="truncate font-extrabold text-white">{d.name}</div>
          <div className="tabular truncate text-[11px] text-[var(--faint)]">
            {d.team ? `${d.team} · ` : ""}
            {rounds.length} rundi · savladano {d.mastered}/{bank} · {d.weak} za popravku
          </div>
        </div>
        <div className="tabular text-right">
          <div className="font-extrabold" style={{ color: accColor(best) }}>
            {best}%
          </div>
          <div className="text-[10px] text-[var(--faint)]">najbolji</div>
        </div>
        <span className="shrink-0 rounded-lg bg-white/8 px-2.5 py-1.5 text-xs font-bold text-[var(--muted)]">
          {open ? "▾ sakrij" : `▸ greške (${d.mistakes.length})`}
        </span>
      </button>

      {/* Bez animacije visine — takva animacija ume da se zaledi ako pregledac
          pauzira JS animacije i onda razvuce praznu povrsinu. */}
      {open && (
        <div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Tile label="Rundi" value={String(rounds.length)} sub={`+${d.sessions.length - rounds.length} popravnih`} />
              <Tile label="Prosek" value={`${avg}%`} color={accColor(avg)} />
              <Tile label="Savladano" value={`${d.mastered}/${bank}`} sub={`${d.coverage}%`} color="var(--cyan)" />
              <Tile label="Za popravku" value={String(d.weak)} sub={`${d.unseen} još neviđenih`} color="var(--amber)" />
            </div>

            {d.topics.length > 0 && (
              <div className="mt-5">
                <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Po oblastima
                </h4>
                <div className="space-y-2">
                  {[...d.topics]
                    .sort((a, b) => a.accuracy - b.accuracy)
                    .map((tp) => (
                      <div key={tp.topic}>
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-white">
                            {tp.emoji} {tp.label}
                          </span>
                          <span className="tabular text-[var(--muted)]">
                            {tp.correct}/{tp.asked} ·{" "}
                            <span style={{ color: accColor(tp.accuracy) }}>{tp.accuracy}%</span>
                          </span>
                        </div>
                        <Bar value={tp.accuracy} color={tp.color} />
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="mt-5">
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Greške — {d.mistakes.length} {d.mistakes.length === 1 ? "pitanje" : "pitanja"}
                {stillWrong.length > 0 && (
                  <span className="ml-2 rounded bg-[var(--red)]/20 px-1.5 py-0.5 text-[var(--red-soft)]">
                    {stillWrong.length} još ne zna
                  </span>
                )}
              </h4>

              {d.mistakes.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Nijedna greška u izabranom periodu. 👏</p>
              ) : (
                <div className="space-y-2">
                  {d.mistakes.map((m) => (
                    <div
                      key={m.questionId}
                      className={`rounded-xl border-l-4 bg-white/[0.03] p-3 ${
                        m.stillWrong ? "border-l-[var(--red)]" : "border-l-[var(--green)]"
                      }`}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
                        <span style={{ color: m.color }}>
                          {m.emoji} {m.topicLabel}
                        </span>
                        {m.times > 1 && (
                          <span className="rounded bg-[var(--red)]/20 px-1.5 py-0.5 text-[var(--red-soft)]">
                            {m.times}× promašeno
                          </span>
                        )}
                        {!m.stillWrong && (
                          <span className="rounded bg-[var(--green)]/20 px-1.5 py-0.5 text-[var(--green-soft)]">
                            kasnije naučeno
                          </span>
                        )}
                        <span className="ml-auto font-normal normal-case text-[var(--faint)]">{dt(m.lastAt)}</span>
                      </div>

                      <p className="text-sm font-bold leading-snug text-white">{m.text}</p>
                      <p className="mt-1.5 text-[13px] text-[var(--red-soft)]">
                        <span className="font-bold">Izabrao/la: </span>
                        {m.chosenText ?? "(isteklo vreme)"}
                      </p>
                      <p className="text-[13px] text-[var(--green-soft)]">
                        <span className="font-bold">Tačno: </span>
                        {m.correctText}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5">
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Odigrane runde
              </h4>
              <div className="space-y-1.5">
                {d.sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-[12px]"
                  >
                    <span className="text-[var(--faint)]">{dt(s.finishedAt)}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        s.kind === "round"
                          ? "bg-[var(--cyan)]/15 text-[var(--cyan)]"
                          : "bg-[var(--amber)]/15 text-[var(--amber)]"
                      }`}
                    >
                      {s.kind === "round" ? "runda" : "popravni"}
                    </span>
                    <span className="tabular ml-auto text-[var(--muted)]">
                      {s.correct}/{s.total}
                    </span>
                    <span className="tabular w-12 text-right font-extrabold" style={{ color: accColor(s.percent) }}>
                      {s.percent}%
                    </span>
                    <span className="tabular w-14 text-right text-[var(--faint)]">
                      {formatDuration(s.durationMs)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── strana ─────────────────────────── */

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<Tab>("pregled");
  const [checking, setChecking] = useState(true);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [watched, setWatched] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Izbor praćenih osoba pamtimo u pregledaču — da se ne čekira svaki put iznova.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(WATCH_KEY);
      if (raw) setWatched(JSON.parse(raw) as string[]);
    } catch {
      /* privatni prozor */
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggleWatch(key: string) {
    setWatched((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem(WATCH_KEY, JSON.stringify(next));
      } catch {
        /* nema veze */
      }
      return next;
    });
  }

  const query = useCallback(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (watched.length) p.set("players", watched.join(","));
    return p.toString();
  }, [from, to, watched]);

  const fetchStats = useCallback(async (): Promise<boolean> => {
    const qs = query();
    const res = await fetch(`/api/admin/stats${qs ? `?${qs}` : ""}`, { cache: "no-store" });
    if (res.status === 401) return false;
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Greška pri čitanju baze.");
    setStats(data as Stats);
    return true;
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchStats();
      } catch {
        /* nije prijavljen — prikazujemo formu */
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchStats]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Prijava nije uspela.");
      await fetchStats();
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prijava nije uspela.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setStats(null);
  }

  if (checking) {
    return (
      <main key="checking" className="flex min-h-dvh items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
          className="h-10 w-10 rounded-full border-4 border-white/10 border-t-[var(--red)]"
        />
      </main>
    );
  }

  if (!stats) {
    return (
      <main key="login" className="flex min-h-dvh items-center justify-center px-5">
        <motion.form
          onSubmit={login}
          initial={{ y: 26, scale: 0.96 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass w-full max-w-sm rounded-2xl p-7"
        >
          <div className="mb-5 text-center">
            <div className="text-4xl">🔒</div>
            <h1 className="mt-3 text-xl font-extrabold text-white">Istorija rezultata</h1>
            <p className="mt-1.5 text-sm text-[var(--muted)]">Ovaj deo je samo za organizatore Crvenog krsta.</p>
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder="Lozinka"
            autoFocus
            autoComplete="current-password"
            className="w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-base text-white outline-none transition placeholder:text-[var(--faint)] focus:border-[var(--red)] focus:ring-4 focus:ring-[var(--red)]/20"
          />

          {error && <p className="mt-3 text-sm font-semibold text-[var(--red-soft)]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-xl bg-[var(--red)] px-5 py-3.5 font-extrabold text-white transition hover:bg-[#ff3546] disabled:opacity-50"
          >
            {loading ? "Proveravam…" : "Uđi"}
          </button>

          <Link
            href="/"
            className="mt-3 block text-center text-sm font-semibold text-[var(--muted)] transition hover:text-white"
          >
            ← Nazad na kviz
          </Link>
        </motion.form>
      </main>
    );
  }

  const t = stats.totals;
  const hardest = [...stats.questions].filter((q) => q.asked >= 1).sort((a, b) => a.accuracy - b.accuracy);
  const filtered = Boolean(from || to);
  const qs = query();

  return (
    <main key="dashboard" className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-extrabold text-white">Rezultati kviza</h1>
          <p className="text-xs text-[var(--muted)]">
            Baza: <span className="font-bold">{stats.driver === "postgres" ? "Postgres (Neon)" : "lokalni fajl"}</span>
            {stats.driver === "file" && " — na Vercelu poveži Postgres bazu, inače se rezultati ne čuvaju trajno"}
          </p>
        </div>
        <a
          href={`/api/admin/export${qs ? `?${qs}` : ""}`}
          className="glass rounded-lg px-3.5 py-2 text-sm font-bold text-[var(--muted)] transition hover:text-white"
        >
          ⬇ CSV izvoz
        </a>
        <Link href="/" className="glass rounded-lg px-3.5 py-2 text-sm font-bold text-[var(--muted)] transition hover:text-white">
          Kviz
        </Link>
        <button
          onClick={logout}
          className="glass rounded-lg px-3.5 py-2 text-sm font-bold text-[var(--muted)] transition hover:text-white"
        >
          Odjava
        </button>
      </header>

      {/* ── filter po periodu ── */}
      <div className="glass mb-5 flex flex-wrap items-center gap-2 rounded-xl p-3">
        <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-[var(--faint)]">Period</span>

        {[
          { l: "Sve vreme", f: "", t: "" },
          { l: "Danas", f: isoDay(0), t: "" },
          { l: "7 dana", f: isoDay(6), t: "" },
          { l: "30 dana", f: isoDay(29), t: "" },
        ].map((p) => {
          const active = from === p.f && to === p.t;
          return (
            <button
              key={p.l}
              onClick={() => {
                setFrom(p.f);
                setTo(p.t);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                active ? "bg-[var(--red)] text-white" : "bg-white/8 text-[var(--muted)] hover:text-white"
              }`}
            >
              {p.l}
            </button>
          );
        })}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label htmlFor="od" className="text-[11px] font-bold uppercase tracking-wider text-[var(--faint)]">
            Od
          </label>
          <input
            id="od"
            type="date"
            value={from}
            max={to || isoDay(0)}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-black/30 px-2.5 py-1.5 text-xs text-white outline-none focus:border-[var(--red)]"
          />
          <label htmlFor="do" className="text-[11px] font-bold uppercase tracking-wider text-[var(--faint)]">
            Do
          </label>
          <input
            id="do"
            type="date"
            value={to}
            min={from || undefined}
            max={isoDay(0)}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-black/30 px-2.5 py-1.5 text-xs text-white outline-none focus:border-[var(--red)]"
          />
        </div>

        {filtered && (
          <p className="w-full text-[11px] text-[var(--amber)]">
            Prikazano {stats.sessions.length} od ukupno {stats.unfilteredSessions} rundi u bazi.
          </p>
        )}
      </div>

      {/* ── kartice ── */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((x) => (
          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            className={`relative rounded-lg px-3.5 py-2 text-sm font-bold transition ${
              tab === x.id ? "text-white" : "text-[var(--muted)] hover:text-white"
            }`}
          >
            {tab === x.id && <span className="absolute inset-0 rounded-lg bg-[var(--red)]" />}
            <span className="relative z-10">
              {x.emoji} {x.label}
              {x.id === "grupa" && watched.length > 0 && (
                <span className="ml-1.5 rounded bg-black/30 px-1.5 py-0.5 text-[10px]">{watched.length}</span>
              )}
            </span>
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ y: 14 }} animate={{ y: 0 }} transition={{ duration: 0.25 }}>
        {/* ───────────── PREGLED ───────────── */}
        {tab === "pregled" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile label="Takmičara" value={String(t.players)} sub="različitih imena" />
              <Tile label="Odigranih rundi" value={String(t.rounds)} sub={`+ ${t.retries} popravnih`} color="var(--cyan)" />
              <Tile
                label="Prosečan rezultat"
                value={`${t.avgPercent}%`}
                sub={`najbolji ${t.bestPercent}%`}
                color={accColor(t.avgPercent)}
              />
              <Tile label="Ukupno odgovora" value={String(t.answers)} sub={`${t.accuracy}% tačnih`} color="var(--violet)" />
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile label="Isteklo vreme" value={String(t.timeouts)} sub="bez odgovora" color="var(--amber)" />
              <Tile label="Ukupno vremena" value={formatDuration(t.totalTimeMs)} sub="svi zajedno" />
              <Tile label="Pitanja u bazi" value={String(t.questionsInBank)} />
              <Tile label="Još nepostavljena" value={String(t.questionsNeverAsked)} sub="nijednom" color="var(--faint)" />
            </div>

            {stats.players.length > 0 ? (
              <div className="glass rounded-2xl p-5">
                <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[var(--muted)]">
                  🏆 Rang lista (po najboljem rezultatu)
                </h2>
                <div className="space-y-2">
                  {stats.players.slice(0, 10).map((p, i) => (
                    <div key={p.key} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
                      <span className="tabular w-7 shrink-0 text-center text-lg font-extrabold text-[var(--faint)]">
                        {["🥇", "🥈", "🥉"][i] ?? i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-white">
                          {p.name}
                          {watched.includes(p.key) && <span className="ml-1.5 text-[var(--amber)]">⭐</span>}
                        </div>
                        {p.team && <div className="truncate text-[11px] text-[var(--faint)]">{p.team}</div>}
                      </div>
                      <div className="hidden w-28 sm:block">
                        <Bar value={p.coverage} color="var(--cyan)" />
                        <div className="tabular mt-1 text-[10px] text-[var(--faint)]">
                          {p.mastered}/{t.questionsInBank} savladano
                        </div>
                      </div>
                      <div className="tabular w-16 shrink-0 text-right">
                        <div className="text-base font-extrabold" style={{ color: accColor(p.bestPercent) }}>
                          {p.bestPercent}%
                        </div>
                        <div className="text-[10px] text-[var(--faint)]">{p.rounds} rundi</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-10 text-center">
                <div className="text-4xl">🗒️</div>
                <p className="mt-3 font-bold text-white">
                  {filtered ? "Nema rezultata u izabranom periodu" : "Još nema odigranih kvizova"}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {filtered ? "Probaj da proširiš period." : "Čim neko odigra rundu, ovde će se pojaviti rezultati."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ───────────── MOJA GRUPA ───────────── */}
        {tab === "grupa" && (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-4">
              <button
                onClick={() => setPickerOpen((v) => !v)}
                className="flex w-full items-center gap-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--muted)]">
                    Koga pratiš
                  </h2>
                  <p className="truncate text-[12px] text-[var(--faint)]">
                    {watched.length
                      ? `${watched.length} od ${stats.roster.length}: ${stats.detail.map((d) => d.name).join(", ")}`
                      : "još niko nije označen"}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-white/8 px-2.5 py-1.5 text-xs font-bold text-[var(--muted)]">
                  {pickerOpen ? "▾ sakrij" : "▸ izmeni"}
                </span>
              </button>

              <div className={pickerOpen || watched.length === 0 ? "" : "hidden"}>
              <p className="mt-3 text-[13px] text-[var(--muted)]">
                Klikni na imena onih koje želiš detaljno da pratiš. Izbor se pamti na ovom računaru.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {stats.roster.map((r) => {
                  const on = watched.includes(r.key);
                  return (
                    <button
                      key={r.key}
                      onClick={() => toggleWatch(r.key)}
                      className={`rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
                        on
                          ? "border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--amber)]"
                          : "border-[var(--border)] bg-white/[0.03] text-[var(--muted)] hover:text-white"
                      }`}
                    >
                      <span className="mr-1.5">{on ? "⭐" : "☆"}</span>
                      {r.name}
                      {r.team && <span className="ml-1.5 font-normal opacity-60">· {r.team}</span>}
                    </button>
                  );
                })}
                {stats.roster.length === 0 && <p className="text-sm text-[var(--muted)]">Još niko nije odigrao kviz.</p>}
              </div>

              {watched.length > 0 && (
                <button
                  onClick={() => {
                    setWatched([]);
                    try {
                      localStorage.removeItem(WATCH_KEY);
                    } catch {
                      /* nema veze */
                    }
                  }}
                  className="mt-3 text-xs font-bold text-[var(--faint)] underline hover:text-white"
                >
                  Poništi izbor
                </button>
              )}
              </div>
            </div>

            {watched.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center">
                <div className="text-4xl">⭐</div>
                <p className="mt-3 font-bold text-white">Izaberi koga pratiš</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Označi imena gore i ovde dobijaš detaljnu analizu — svako pitanje koje su promašili, šta su
                  izabrali i koji je tačan odgovor.
                </p>
              </div>
            ) : stats.detail.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center text-[var(--muted)]">
                Označene osobe nemaju odigranih rundi u izabranom periodu.
              </div>
            ) : (
              <>
                <GroupReport detail={stats.detail} bank={t.questionsInBank} />

                <h2 className="mt-7 text-sm font-extrabold uppercase tracking-wider text-[var(--muted)]">
                  Pojedinačno po takmičaru
                </h2>
                <div className="space-y-3">
                  {stats.detail.map((d) => (
                    <DetailCard key={d.key} d={d} bank={t.questionsInBank} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ───────────── SVI TAKMIČARI ───────────── */}
        {tab === "takmicari" && (
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase tracking-wider text-[var(--faint)]">
                  <th className="p-3">Prati</th>
                  <th className="p-3">Ime</th>
                  <th className="p-3">Ekipa</th>
                  <th className="p-3 text-center">Rundi</th>
                  <th className="p-3 text-center">Najbolji</th>
                  <th className="p-3 text-center">Prosek</th>
                  <th className="p-3 text-center">Tačnost</th>
                  <th className="p-3">Savladano</th>
                  <th className="p-3 text-center">Niz</th>
                  <th className="p-3 text-center">Prosek/pit.</th>
                  <th className="p-3">Poslednji put</th>
                </tr>
              </thead>
              <tbody>
                {stats.players.map((p) => (
                  <tr key={p.key} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={watched.includes(p.key)}
                        onChange={() => toggleWatch(p.key)}
                        aria-label={`Prati ${p.name}`}
                        className="h-4 w-4 cursor-pointer accent-[var(--amber)]"
                      />
                    </td>
                    <td className="p-3 font-bold text-white">{p.name}</td>
                    <td className="p-3 text-[var(--muted)]">{p.team || "—"}</td>
                    <td className="tabular p-3 text-center text-[var(--muted)]">
                      {p.rounds}
                      {p.retries > 0 && <span className="text-[var(--faint)]"> +{p.retries}</span>}
                    </td>
                    <td className="tabular p-3 text-center font-extrabold" style={{ color: accColor(p.bestPercent) }}>
                      {p.bestPercent}%
                    </td>
                    <td className="tabular p-3 text-center text-[var(--muted)]">{p.avgPercent}%</td>
                    <td className="tabular p-3 text-center text-[var(--muted)]">{p.accuracy}%</td>
                    <td className="p-3">
                      <Bar value={p.coverage} color="var(--cyan)" />
                      <div className="tabular mt-1 text-[10px] text-[var(--faint)]">
                        {p.mastered}/{t.questionsInBank} · {p.weak} za popravku
                      </div>
                    </td>
                    <td className="tabular p-3 text-center text-[var(--amber)]">{p.bestStreak}</td>
                    <td className="tabular p-3 text-center text-[var(--muted)]">
                      {(p.avgTimePerQuestion / 1000).toFixed(1)}s
                    </td>
                    <td className="p-3 text-xs text-[var(--faint)]">{dt(p.lastPlayed)}</td>
                  </tr>
                ))}
                {stats.players.length === 0 && (
                  <tr>
                    <td colSpan={11} className="p-10 text-center text-[var(--muted)]">
                      Nema takmičara u izabranom periodu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ───────────── SESIJE ───────────── */}
        {tab === "sesije" && (
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase tracking-wider text-[var(--faint)]">
                  <th className="p-3">Vreme</th>
                  <th className="p-3">Ime</th>
                  <th className="p-3">Ekipa</th>
                  <th className="p-3">Tip</th>
                  <th className="p-3 text-center">Tačno</th>
                  <th className="p-3 text-center">Rezultat</th>
                  <th className="p-3 text-center">Bodovi</th>
                  <th className="p-3 text-center">Niz</th>
                  <th className="p-3 text-center">Trajanje</th>
                </tr>
              </thead>
              <tbody>
                {stats.sessions.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                    <td className="p-3 text-xs text-[var(--faint)]">{dt(s.finishedAt)}</td>
                    <td className="p-3 font-bold text-white">{s.playerName}</td>
                    <td className="p-3 text-[var(--muted)]">{s.team || "—"}</td>
                    <td className="p-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          s.kind === "round"
                            ? "bg-[var(--cyan)]/15 text-[var(--cyan)]"
                            : "bg-[var(--amber)]/15 text-[var(--amber)]"
                        }`}
                      >
                        {s.kind === "round" ? "runda" : "popravni"}
                      </span>
                    </td>
                    <td className="tabular p-3 text-center text-[var(--muted)]">
                      {s.correct}/{s.total}
                    </td>
                    <td className="tabular p-3 text-center font-extrabold" style={{ color: accColor(s.percent) }}>
                      {s.percent}%
                    </td>
                    <td className="tabular p-3 text-center text-[var(--violet)]">{s.score}</td>
                    <td className="tabular p-3 text-center text-[var(--amber)]">{s.bestStreak}</td>
                    <td className="tabular p-3 text-center text-[var(--muted)]">{formatDuration(s.durationMs)}</td>
                  </tr>
                ))}
                {stats.sessions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-[var(--muted)]">
                      Nema rundi u izabranom periodu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ───────────── PITANJA ───────────── */}
        {tab === "pitanja" && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--muted)]">
              Sortirano od najtežih ka najlakšim — pitanja na vrhu takmičari najčešće promaše.
            </p>
            {hardest.map((q) => (
              <div key={q.id} className="glass rounded-xl p-4">
                <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
                  <span className="rounded bg-white/8 px-1.5 py-0.5 text-[var(--faint)]">{q.id}</span>
                  <span className="text-[var(--muted)]">{q.topicLabel}</span>
                  <span className="tabular ml-auto text-[var(--faint)]">
                    {q.correct}/{q.asked} tačnih · {(q.avgTimeMs / 1000).toFixed(1)}s
                    {q.timeouts > 0 && ` · ${q.timeouts}× isteklo`}
                  </span>
                </div>
                <p className="text-sm font-semibold leading-snug text-white">{q.text}</p>
                <div className="mt-2.5 flex items-center gap-3">
                  <Bar value={q.accuracy} color={accColor(q.accuracy)} />
                  <span
                    className="tabular w-12 shrink-0 text-right text-sm font-extrabold"
                    style={{ color: accColor(q.accuracy) }}
                  >
                    {q.accuracy}%
                  </span>
                </div>
              </div>
            ))}
            {hardest.length === 0 && (
              <div className="glass rounded-2xl p-10 text-center text-[var(--muted)]">
                Nijedno pitanje nije postavljeno u izabranom periodu.
              </div>
            )}
          </div>
        )}

        {/* ───────────── ANALIZA ───────────── */}
        {tab === "analiza" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass rounded-2xl p-5">
              <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[var(--muted)]">
                Uspeh po oblastima
              </h2>
              <div className="space-y-3">
                {stats.topics
                  .filter((x) => x.asked > 0)
                  .sort((a, b) => a.accuracy - b.accuracy)
                  .map((x) => (
                    <div key={x.topic}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-bold text-white">
                          {x.emoji} {x.label}
                        </span>
                        <span className="tabular text-[var(--muted)]">
                          {x.correct}/{x.asked} · <span style={{ color: accColor(x.accuracy) }}>{x.accuracy}%</span>
                        </span>
                      </div>
                      <Bar value={x.accuracy} color={x.color} />
                    </div>
                  ))}
                {stats.topics.every((x) => x.asked === 0) && <p className="text-sm text-[var(--muted)]">Nema podataka.</p>}
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[var(--muted)]">
                Uspeh po režimu igre
              </h2>
              <div className="space-y-3">
                {stats.modes
                  .filter((x) => x.asked > 0)
                  .map((x) => (
                    <div key={x.mode}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-bold text-white">
                          {x.emoji} {x.label}
                        </span>
                        <span className="tabular text-[var(--muted)]">
                          {x.correct}/{x.asked} · {(x.avgTimeMs / 1000).toFixed(1)}s ·{" "}
                          <span style={{ color: accColor(x.accuracy) }}>{x.accuracy}%</span>
                        </span>
                      </div>
                      <Bar value={x.accuracy} color={accColor(x.accuracy)} />
                    </div>
                  ))}
                {stats.modes.every((x) => x.asked === 0) && <p className="text-sm text-[var(--muted)]">Nema podataka.</p>}
              </div>
            </div>

            <div className="glass rounded-2xl p-5 lg:col-span-2">
              <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[var(--muted)]">
                Aktivnost po danima
              </h2>
              {stats.daily.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Nema podataka.</p>
              ) : (
                <div className="flex h-40 items-end gap-1.5 overflow-x-auto pb-1">
                  {stats.daily.map((d) => {
                    const max = Math.max(...stats.daily.map((x) => x.sessions));
                    return (
                      <button
                        key={d.date}
                        onClick={() => {
                          setFrom(d.date);
                          setTo(d.date);
                        }}
                        title={`Prikaži samo ${d.date}`}
                        className="group flex min-w-[26px] flex-1 flex-col items-center gap-1"
                      >
                        <span className="tabular text-[10px] font-bold text-[var(--muted)] opacity-0 transition group-hover:opacity-100">
                          {d.sessions} · {d.avgPercent}%
                        </span>
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-[var(--red)]/40 to-[var(--red)] transition-[height] duration-700 ease-out group-hover:brightness-125"
                          style={{ height: `${(d.sessions / max) * 100}%`, minHeight: 4 }}
                        />
                        <span className="text-[9px] text-[var(--faint)]">{d.date.slice(5)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="mt-2 text-[11px] text-[var(--faint)]">Klikni na stubić da vidiš samo taj dan.</p>
            </div>
          </div>
        )}
      </motion.div>

      <p className="mt-8 text-center text-[11px] text-[var(--faint)]">
        Osveženo {new Date(stats.generatedAt).toLocaleString("sr-RS")} ·{" "}
        <button onClick={() => fetchStats()} className="font-bold underline hover:text-white">
          osveži
        </button>
      </p>
    </main>
  );
}
