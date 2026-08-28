import { QUESTIONS, QUESTION_BY_ID } from "./questions";
import type { GameMode, Question, RoundQuestion } from "./types";

export const ROUND_SIZE = 25;

export const MODE_CONFIG: Record<
  GameMode,
  { label: string; emoji: string; seconds: number; base: number; color: string; hint: string }
> = {
  classic: {
    label: "Klasično",
    emoji: "📋",
    seconds: 45,
    base: 100,
    color: "#38bdf8",
    hint: "Bez žurbe — razmisli pa odgovori.",
  },
  speed: {
    label: "Brzi metak",
    emoji: "⚡",
    seconds: 10,
    base: 150,
    color: "#facc15",
    hint: "Samo 10 sekundi! Reaguj kao na terenu.",
  },
  elimination: {
    label: "Pola-pola",
    emoji: "✂️",
    seconds: 20,
    base: 140,
    color: "#a78bfa",
    hint: "Ako oklevaš, posle 7s nestaje jedan netačan odgovor — ali i bodovi padaju.",
  },
  double: {
    label: "Duplo ili ništa",
    emoji: "🎲",
    seconds: 30,
    base: 100,
    color: "#fb7185",
    hint: "Tačno = dupli bodovi. Netačno = minus 100.",
  },
  lightning: {
    label: "Munja",
    emoji: "🔥",
    seconds: 8,
    base: 200,
    color: "#f97316",
    hint: "Finiš! 8 sekundi, najviše bodova u igri.",
  },
};

/** Kazneni bodovi za promašen "Duplo ili ništa". */
export const DOUBLE_PENALTY = 100;
/** Posle koliko sekundi "Pola-pola" ukloni jedan netačan odgovor. */
export const ELIMINATION_AFTER = 7;
/** Umanjenje bodova ako je igrač dočekao eliminaciju netačnog odgovora. */
export const ELIMINATION_PENALTY_FACTOR = 0.5;

export function streakMultiplier(streak: number): number {
  if (streak >= 8) return 2;
  if (streak >= 5) return 1.5;
  if (streak >= 3) return 1.2;
  return 1;
}

/** Maksimum koji je teoretski moguć na jednom pitanju (za % skora). */
export function maxPointsFor(mode: GameMode): number {
  const base = MODE_CONFIG[mode].base;
  const withTimeBonus = base + Math.round(base * 0.5);
  return mode === "double" ? withTimeBonus * 2 : withTimeBonus;
}

export function scoreAnswer(opts: {
  mode: GameMode;
  isCorrect: boolean;
  msLeft: number;
  msTotal: number;
  streakBefore: number;
  eliminationUsed?: boolean;
}): number {
  const { mode, isCorrect, msLeft, msTotal, streakBefore, eliminationUsed } = opts;
  const cfg = MODE_CONFIG[mode];

  if (!isCorrect) return mode === "double" ? -DOUBLE_PENALTY : 0;

  const remaining = Math.max(0, Math.min(1, msLeft / msTotal));
  let points = cfg.base + Math.round(cfg.base * 0.5 * remaining);

  if (mode === "elimination" && eliminationUsed) {
    points = Math.round(points * ELIMINATION_PENALTY_FACTOR);
  }

  points = Math.round(points * streakMultiplier(streakBefore + 1));
  if (mode === "double") points *= 2;

  return points;
}

/* ─────────────────────────── mešanje ─────────────────────────── */

/** Deterministički RNG (mulberry32) — isti seed daje isti raspored. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: readonly T[], rand: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ─────────────────────── sastavljanje runde ─────────────────────── */

/**
 * Bira pitanja za rundu po prioritetu:
 *   1. pitanja koja igrač nikada nije video
 *   2. pitanja koja je poslednji put pogrešio
 *   3. već savladana (tek kad se prve dve grupe isprazne)
 *
 * Nikada ne stavlja dva "blizanca" (isti `group`) u istu rundu — inače bi
 * takmičar u istoj rundi dobio isto pitanje sa dva različita seta odgovora.
 */
export function pickQuestions(opts: {
  count: number;
  mastered: Set<string>;
  weak: Set<string>;
  rand: () => number;
  only?: string[];
}): Question[] {
  const { count, mastered, weak, rand, only } = opts;

  if (only && only.length) {
    const list = only.map((id) => QUESTION_BY_ID.get(id)).filter((q): q is Question => Boolean(q));
    return shuffle(list, rand).slice(0, count);
  }

  const unseen: Question[] = [];
  const wrong: Question[] = [];
  const known: Question[] = [];
  for (const q of QUESTIONS) {
    if (weak.has(q.id)) wrong.push(q);
    else if (mastered.has(q.id)) known.push(q);
    else unseen.push(q);
  }

  const tiers = [shuffle(unseen, rand), shuffle(wrong, rand), shuffle(known, rand)];
  const chosen: Question[] = [];
  const usedGroups = new Set<string>();
  const skipped: Question[] = [];

  for (const tier of tiers) {
    for (const q of tier) {
      if (chosen.length >= count) break;
      if (q.group && usedGroups.has(q.group)) {
        skipped.push(q);
        continue;
      }
      if (q.group) usedGroups.add(q.group);
      chosen.push(q);
    }
    if (chosen.length >= count) break;
  }

  // Krajnji slučaj: baza je manja od runde — tek tada dozvoljavamo blizance.
  for (const q of skipped) {
    if (chosen.length >= count) break;
    chosen.push(q);
  }

  return chosen;
}

/** Raspoređuje režime igre po rundi — poslednja pitanja su uvek "Munja". */
export function assignModes(count: number, rand: () => number): GameMode[] {
  if (count <= 0) return [];
  if (count <= 3) {
    return Array.from({ length: count }, (_, i) => (i === count - 1 ? "speed" : "classic"));
  }

  const lightning = Math.min(2, Math.max(1, Math.round(count * 0.08)));
  const body = count - lightning;
  const speed = Math.max(1, Math.round(body * 0.22));
  const elimination = Math.max(1, Math.round(body * 0.17));
  const double = Math.max(1, Math.round(body * 0.13));
  const classic = Math.max(0, body - speed - elimination - double);

  const pool: GameMode[] = [
    ...Array<GameMode>(classic).fill("classic"),
    ...Array<GameMode>(speed).fill("speed"),
    ...Array<GameMode>(elimination).fill("elimination"),
    ...Array<GameMode>(double).fill("double"),
  ];

  const shuffled = shuffle(pool, rand);
  // Prvo pitanje neka bude mirno — da igrač uhvati ritam.
  const firstClassic = shuffled.indexOf("classic");
  if (firstClassic > 0) {
    [shuffled[0], shuffled[firstClassic]] = [shuffled[firstClassic], shuffled[0]];
  }

  return [...shuffled, ...Array<GameMode>(lightning).fill("lightning")];
}

/** Sastavlja kompletnu rundu: izmešana pitanja + izmešane opcije + režimi. */
export function buildRound(opts: {
  count: number;
  mastered: Set<string>;
  weak: Set<string>;
  seed: number;
  only?: string[];
}): RoundQuestion[] {
  const rand = rng(opts.seed);
  const picked = pickQuestions({ ...opts, rand });
  const modes = assignModes(picked.length, rand);

  return picked.map((q, i) => {
    const order = shuffle(
      q.options.map((_, idx) => idx),
      rand
    );
    return {
      id: q.id,
      topic: q.topic,
      text: q.text,
      options: order.map((idx) => q.options[idx]),
      correct: order.indexOf(q.correct),
      mode: modes[i],
      note: q.note,
      visual: q.visual,
    };
  });
}

/* ─────────────────────────── ocena ─────────────────────────── */

export function grade(percent: number): { label: string; emoji: string; color: string; message: string } {
  if (percent >= 95)
    return {
      label: "Savršeno",
      emoji: "🏆",
      color: "#fbbf24",
      message: "Ovo je nivo takmičarske ekipe. Svaka čast!",
    };
  if (percent >= 85)
    return { label: "Odličan", emoji: "🥇", color: "#34d399", message: "Odlično znanje — spreman/na si za takmičenje." };
  if (percent >= 70)
    return { label: "Vrlo dobar", emoji: "🥈", color: "#38bdf8", message: "Vrlo dobro. Prođi još jednom greške i tu si." };
  if (percent >= 55)
    return { label: "Dobar", emoji: "🥉", color: "#a78bfa", message: "Osnove stoje, ali ima šta da se dopuni." };
  if (percent >= 40)
    return { label: "Dovoljan", emoji: "📘", color: "#fb923c", message: "Vredi ponoviti gradivo pa probati opet." };
  return { label: "Nedovoljan", emoji: "📕", color: "#f87171", message: "Ne brini — ponovi pitanja koja nisi znao i biće bolje." };
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 60);
}

/** Ključ igrača — bez dijakritike, mala slova, da se „Miloš” i „Milos” ne razdvoje. */
export function playerKey(name: string): string {
  return normalizeName(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\u0300-\u036f]", "g"), "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
