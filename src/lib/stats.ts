import type { StoredAnswer, StoredSession } from "./db";
import { QUESTION_BY_ID, QUESTIONS, TOPICS } from "./questions";
import { MODE_CONFIG } from "./quiz";
import type { GameMode, TopicId } from "./types";

export type PlayerStat = {
  key: string;
  name: string;
  team: string;
  rounds: number;
  retries: number;
  bestPercent: number;
  avgPercent: number;
  bestScore: number;
  totalScore: number;
  answers: number;
  correct: number;
  accuracy: number;
  mastered: number;
  coverage: number;
  weak: number;
  bestStreak: number;
  totalTimeMs: number;
  avgTimePerQuestion: number;
  timeouts: number;
  firstPlayed: string;
  lastPlayed: string;
};

export type QuestionStat = {
  id: string;
  text: string;
  topic: TopicId;
  topicLabel: string;
  asked: number;
  correct: number;
  accuracy: number;
  avgTimeMs: number;
  timeouts: number;
  hasNote: boolean;
};

export type TopicStat = {
  topic: TopicId;
  label: string;
  emoji: string;
  color: string;
  asked: number;
  correct: number;
  accuracy: number;
};

export type ModeStat = {
  mode: GameMode;
  label: string;
  emoji: string;
  asked: number;
  correct: number;
  accuracy: number;
  avgTimeMs: number;
};

export type AdminStats = {
  driver: string;
  generatedAt: string;
  totals: {
    players: number;
    rounds: number;
    retries: number;
    answers: number;
    correct: number;
    accuracy: number;
    avgPercent: number;
    bestPercent: number;
    totalTimeMs: number;
    timeouts: number;
    questionsInBank: number;
    questionsNeverAsked: number;
  };
  players: PlayerStat[];
  sessions: StoredSession[];
  questions: QuestionStat[];
  topics: TopicStat[];
  modes: ModeStat[];
  daily: { date: string; sessions: number; avgPercent: number }[];
};

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

export function buildStats(
  sessions: StoredSession[],
  answers: StoredAnswer[],
  driver: string
): AdminStats {
  const byPlayer = new Map<string, PlayerStat>();
  const answersByPlayer = new Map<string, StoredAnswer[]>();

  for (const a of answers) {
    const list = answersByPlayer.get(a.playerKey);
    if (list) list.push(a);
    else answersByPlayer.set(a.playerKey, [a]);
  }

  for (const s of sessions) {
    let p = byPlayer.get(s.playerKey);
    if (!p) {
      p = {
        key: s.playerKey,
        name: s.playerName,
        team: s.team,
        rounds: 0,
        retries: 0,
        bestPercent: 0,
        avgPercent: 0,
        bestScore: 0,
        totalScore: 0,
        answers: 0,
        correct: 0,
        accuracy: 0,
        mastered: 0,
        coverage: 0,
        weak: 0,
        bestStreak: 0,
        totalTimeMs: 0,
        avgTimePerQuestion: 0,
        timeouts: 0,
        firstPlayed: s.finishedAt,
        lastPlayed: s.finishedAt,
      };
      byPlayer.set(s.playerKey, p);
    }
    if (s.kind === "round") p.rounds += 1;
    else p.retries += 1;
    if (s.team) p.team = s.team;
    p.bestPercent = Math.max(p.bestPercent, s.percent);
    p.bestScore = Math.max(p.bestScore, s.score);
    p.totalScore += s.score;
    p.bestStreak = Math.max(p.bestStreak, s.bestStreak);
    p.totalTimeMs += s.durationMs;
    if (s.finishedAt < p.firstPlayed) p.firstPlayed = s.finishedAt;
    if (s.finishedAt > p.lastPlayed) p.lastPlayed = s.finishedAt;
  }

  // Prosečan procenat računamo samo iz punih rundi — kratke "popravke" bi ga iskrivile.
  for (const [key, p] of byPlayer) {
    const full = sessions.filter((s) => s.playerKey === key && s.kind === "round");
    p.avgPercent = full.length
      ? Math.round((full.reduce((sum, s) => sum + s.percent, 0) / full.length) * 10) / 10
      : 0;

    const mine = answersByPlayer.get(key) ?? [];
    p.answers = mine.length;
    p.correct = mine.filter((a) => a.isCorrect).length;
    p.accuracy = pct(p.correct, p.answers);
    p.timeouts = mine.filter((a) => a.chosen === null).length;
    p.avgTimePerQuestion = mine.length
      ? Math.round(mine.reduce((sum, a) => sum + a.timeMs, 0) / mine.length)
      : 0;

    const lastByQuestion = new Map<string, boolean>();
    for (const a of mine) lastByQuestion.set(a.questionId, a.isCorrect);
    p.mastered = [...lastByQuestion.values()].filter(Boolean).length;
    p.weak = [...lastByQuestion.values()].filter((ok) => !ok).length;
    p.coverage = pct(p.mastered, QUESTIONS.length);
  }

  const qAgg = new Map<string, { asked: number; correct: number; time: number; timeouts: number }>();
  const tAgg = new Map<string, { asked: number; correct: number }>();
  const mAgg = new Map<string, { asked: number; correct: number; time: number }>();

  for (const a of answers) {
    const q = qAgg.get(a.questionId) ?? { asked: 0, correct: 0, time: 0, timeouts: 0 };
    q.asked += 1;
    if (a.isCorrect) q.correct += 1;
    q.time += a.timeMs;
    if (a.chosen === null) q.timeouts += 1;
    qAgg.set(a.questionId, q);

    const t = tAgg.get(a.topic) ?? { asked: 0, correct: 0 };
    t.asked += 1;
    if (a.isCorrect) t.correct += 1;
    tAgg.set(a.topic, t);

    const m = mAgg.get(a.mode) ?? { asked: 0, correct: 0, time: 0 };
    m.asked += 1;
    if (a.isCorrect) m.correct += 1;
    m.time += a.timeMs;
    mAgg.set(a.mode, m);
  }

  const questions: QuestionStat[] = QUESTIONS.map((q) => {
    const agg = qAgg.get(q.id) ?? { asked: 0, correct: 0, time: 0, timeouts: 0 };
    return {
      id: q.id,
      text: q.text,
      topic: q.topic,
      topicLabel: TOPICS[q.topic].short,
      asked: agg.asked,
      correct: agg.correct,
      accuracy: pct(agg.correct, agg.asked),
      avgTimeMs: agg.asked ? Math.round(agg.time / agg.asked) : 0,
      timeouts: agg.timeouts,
      hasNote: Boolean(q.note),
    };
  });

  const topics: TopicStat[] = (Object.keys(TOPICS) as TopicId[]).map((id) => {
    const agg = tAgg.get(id) ?? { asked: 0, correct: 0 };
    return {
      topic: id,
      label: TOPICS[id].short,
      emoji: TOPICS[id].emoji,
      color: TOPICS[id].color,
      asked: agg.asked,
      correct: agg.correct,
      accuracy: pct(agg.correct, agg.asked),
    };
  });

  const modes: ModeStat[] = (Object.keys(MODE_CONFIG) as GameMode[]).map((id) => {
    const agg = mAgg.get(id) ?? { asked: 0, correct: 0, time: 0 };
    return {
      mode: id,
      label: MODE_CONFIG[id].label,
      emoji: MODE_CONFIG[id].emoji,
      asked: agg.asked,
      correct: agg.correct,
      accuracy: pct(agg.correct, agg.asked),
      avgTimeMs: agg.asked ? Math.round(agg.time / agg.asked) : 0,
    };
  });

  const dayAgg = new Map<string, { sessions: number; sum: number }>();
  for (const s of sessions) {
    const date = s.finishedAt.slice(0, 10);
    const d = dayAgg.get(date) ?? { sessions: 0, sum: 0 };
    d.sessions += 1;
    d.sum += s.percent;
    dayAgg.set(date, d);
  }

  const fullRounds = sessions.filter((s) => s.kind === "round");
  const correctAnswers = answers.filter((a) => a.isCorrect).length;

  return {
    driver,
    generatedAt: new Date().toISOString(),
    totals: {
      players: byPlayer.size,
      rounds: fullRounds.length,
      retries: sessions.length - fullRounds.length,
      answers: answers.length,
      correct: correctAnswers,
      accuracy: pct(correctAnswers, answers.length),
      avgPercent: fullRounds.length
        ? Math.round((fullRounds.reduce((s, x) => s + x.percent, 0) / fullRounds.length) * 10) / 10
        : 0,
      bestPercent: sessions.reduce((m, s) => Math.max(m, s.percent), 0),
      totalTimeMs: sessions.reduce((s, x) => s + x.durationMs, 0),
      timeouts: answers.filter((a) => a.chosen === null).length,
      questionsInBank: QUESTIONS.length,
      questionsNeverAsked: QUESTIONS.filter((q) => !qAgg.has(q.id)).length,
    },
    players: [...byPlayer.values()].sort((a, b) => b.bestPercent - a.bestPercent || b.bestScore - a.bestScore),
    sessions,
    questions,
    topics,
    modes,
    daily: [...dayAgg]
      .map(([date, d]) => ({ date, sessions: d.sessions, avgPercent: Math.round((d.sum / d.sessions) * 10) / 10 }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/** CSV izvoz svih odgovora — za Excel / dalju obradu. */
export function answersToCsv(sessions: StoredSession[], answers: StoredAnswer[]): string {
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = [
    "vreme",
    "ime",
    "ekipa",
    "tip_runde",
    "sesija",
    "id_pitanja",
    "oblast",
    "rezim",
    "pitanje",
    "izabran_odgovor",
    "tacan_odgovor",
    "tacno",
    "vreme_ms",
    "bodovi",
  ];

  const rows = answers.map((a) => {
    const s = sessionById.get(a.sessionId);
    const q = QUESTION_BY_ID.get(a.questionId);
    return [
      a.createdAt,
      s?.playerName ?? "",
      s?.team ?? "",
      s?.kind ?? "",
      a.sessionId,
      a.questionId,
      q ? TOPICS[q.topic].short : a.topic,
      a.mode,
      q?.text ?? "",
      a.chosen === null ? "(isteklo vreme)" : String(a.chosen + 1),
      String(a.correctIdx + 1),
      a.isCorrect ? "DA" : "NE",
      a.timeMs,
      a.points,
    ]
      .map(esc)
      .join(",");
  });

  return "﻿" + [header.map(esc).join(","), ...rows].join("\r\n");
}
