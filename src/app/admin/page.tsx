"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatDuration } from "@/lib/quiz";
import type { AdminStats } from "@/lib/stats";

type Tab = "pregled" | "takmicari" | "sesije" | "pitanja" | "analiza";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "pregled", label: "Pregled", emoji: "📊" },
  { id: "takmicari", label: "Takmičari", emoji: "🧑‍🤝‍🧑" },
  { id: "sesije", label: "Sve runde", emoji: "🗓" },
  { id: "pitanja", label: "Pitanja", emoji: "❓" },
  { id: "analiza", label: "Analiza", emoji: "🔬" },
];

function dt(iso: string) {
  return new Date(iso).toLocaleString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Bar({ value, color = "var(--green)" }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full min-w-[70px] overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
      />
    </div>
  );
}

function Tile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
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

function accColor(v: number) {
  return v >= 80 ? "var(--green)" : v >= 60 ? "var(--amber)" : "var(--red)";
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tab, setTab] = useState<Tab>("pregled");
  const [checking, setChecking] = useState(true);

  const fetchStats = useCallback(async (): Promise<boolean> => {
    const res = await fetch("/api/admin/stats", { cache: "no-store" });
    if (res.status === 401) return false;
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Greška pri čitanju baze.");
    setStats(data as AdminStats);
    return true;
  }, []);

  // Ako kolačić još važi, preskačemo unos lozinke.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchStats();
      } catch {
        /* nema prijave — prikazujemo formu */
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

  /* ── ekran za prijavu ── */
  if (checking) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
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
      <main className="flex min-h-dvh items-center justify-center px-5">
        <motion.form
          onSubmit={login}
          initial={{ opacity: 0, y: 26, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass w-full max-w-sm rounded-2xl p-7"
        >
          <div className="mb-5 text-center">
            <div className="text-4xl">🔒</div>
            <h1 className="mt-3 text-xl font-extrabold text-white">Istorija rezultata</h1>
            <p className="mt-1.5 text-sm text-[var(--muted)]">
              Ovaj deo je samo za organizatore Crvenog krsta.
            </p>
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

  /* ── kontrolna tabla ── */
  const t = stats.totals;
  const hardest = [...stats.questions].filter((q) => q.asked >= 1).sort((a, b) => a.accuracy - b.accuracy);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-extrabold text-white">Rezultati kviza</h1>
          <p className="text-xs text-[var(--muted)]">
            Baza: <span className="font-bold">{stats.driver === "postgres" ? "Postgres (Neon)" : "lokalni fajl"}</span>
            {stats.driver === "file" && " — na Vercelu poveži Postgres bazu, inače se rezultati ne čuvaju trajno"}
          </p>
        </div>
        <a
          href="/api/admin/export"
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

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((x) => (
          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            className={`relative rounded-lg px-3.5 py-2 text-sm font-bold transition ${
              tab === x.id ? "text-white" : "text-[var(--muted)] hover:text-white"
            }`}
          >
            {tab === x.id && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-lg bg-[var(--red)]"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10">
              {x.emoji} {x.label}
            </span>
          </button>
        ))}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
          {/* ───────────── PREGLED ───────────── */}
          {tab === "pregled" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Tile label="Takmičara" value={String(t.players)} sub="različitih imena" />
                <Tile label="Odigranih rundi" value={String(t.rounds)} sub={`+ ${t.retries} popravnih`} color="var(--cyan)" />
                <Tile label="Prosečan rezultat" value={`${t.avgPercent}%`} sub={`najbolji ${t.bestPercent}%`} color={accColor(t.avgPercent)} />
                <Tile label="Ukupno odgovora" value={String(t.answers)} sub={`${t.accuracy}% tačnih`} color="var(--violet)" />
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Tile label="Isteklo vreme" value={String(t.timeouts)} sub="bez odgovora" color="var(--amber)" />
                <Tile label="Ukupno vremena" value={formatDuration(t.totalTimeMs)} sub="svi zajedno" />
                <Tile label="Pitanja u bazi" value={String(t.questionsInBank)} />
                <Tile label="Još nepostavljena" value={String(t.questionsNeverAsked)} sub="nijednom" color="var(--faint)" />
              </div>

              {stats.players.length > 0 && (
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
                          <div className="truncate text-sm font-bold text-white">{p.name}</div>
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
              )}

              {stats.players.length === 0 && (
                <div className="glass rounded-2xl p-10 text-center">
                  <div className="text-4xl">🗒️</div>
                  <p className="mt-3 font-bold text-white">Još nema odigranih kvizova</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Čim neko odigra rundu, ovde će se pojaviti rezultati i statistika.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ───────────── TAKMIČARI ───────────── */}
          {tab === "takmicari" && (
            <div className="glass overflow-x-auto rounded-2xl">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase tracking-wider text-[var(--faint)]">
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
                      <td colSpan={10} className="p-10 text-center text-[var(--muted)]">
                        Još nema takmičara.
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
                        Još nema odigranih rundi.
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
                Sortirano od najtežih ka najlakšim — pitanja na vrhu su ona koja takmičari najčešće promaše.
              </p>
              {hardest.map((q) => (
                <div key={q.id} className="glass rounded-xl p-4">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
                    <span className="rounded bg-white/8 px-1.5 py-0.5 text-[var(--faint)]">{q.id}</span>
                    <span className="text-[var(--muted)]">{q.topicLabel}</span>
                    {q.hasNote && <span className="text-[var(--amber)]">⚠ sporan sken</span>}
                    <span className="tabular ml-auto text-[var(--faint)]">
                      {q.correct}/{q.asked} tačnih · {(q.avgTimeMs / 1000).toFixed(1)}s
                      {q.timeouts > 0 && ` · ${q.timeouts}× isteklo`}
                    </span>
                  </div>
                  <p className="text-sm font-semibold leading-snug text-white">{q.text}</p>
                  <div className="mt-2.5 flex items-center gap-3">
                    <Bar value={q.accuracy} color={accColor(q.accuracy)} />
                    <span className="tabular w-12 shrink-0 text-right text-sm font-extrabold" style={{ color: accColor(q.accuracy) }}>
                      {q.accuracy}%
                    </span>
                  </div>
                </div>
              ))}
              {hardest.length === 0 && (
                <div className="glass rounded-2xl p-10 text-center text-[var(--muted)]">
                  Nijedno pitanje još nije postavljeno.
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
                  {stats.topics.every((x) => x.asked === 0) && (
                    <p className="text-sm text-[var(--muted)]">Nema podataka.</p>
                  )}
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
                  {stats.modes.every((x) => x.asked === 0) && (
                    <p className="text-sm text-[var(--muted)]">Nema podataka.</p>
                  )}
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
                        <div key={d.date} className="group flex min-w-[26px] flex-1 flex-col items-center gap-1">
                          <span className="tabular text-[10px] font-bold text-[var(--muted)] opacity-0 transition group-hover:opacity-100">
                            {d.sessions} · {d.avgPercent}%
                          </span>
                          <div
                            className="w-full rounded-t bg-gradient-to-t from-[var(--red)]/40 to-[var(--red)] transition-[height] duration-700 ease-out"
                            style={{ height: `${(d.sessions / max) * 100}%`, minHeight: 4 }}
                          />
                          <span className="text-[9px] text-[var(--faint)]">{d.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
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
