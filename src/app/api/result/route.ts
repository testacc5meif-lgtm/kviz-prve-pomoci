import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getStore, type StoredAnswer, type StoredSession } from "@/lib/db";
import { QUESTIONS } from "@/lib/questions";
import {
  ELIMINATION_AFTER,
  MODE_CONFIG,
  maxPointsFor,
  normalizeName,
  playerKey,
  scoreAnswer,
} from "@/lib/quiz";
import { verifyRound } from "@/lib/token";
import type { TopicId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: {
    token?: unknown;
    name?: unknown;
    team?: unknown;
    startedAt?: unknown;
    answers?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neispravan zahtev." }, { status: 400 });
  }

  const round = typeof body.token === "string" ? verifyRound(body.token) : null;
  if (!round) {
    return NextResponse.json({ error: "Runda je istekla ili nije važeća." }, { status: 400 });
  }

  const submitted = Array.isArray(body.answers) ? body.answers : null;
  if (!submitted || submitted.length !== round.qs.length) {
    return NextResponse.json({ error: "Broj odgovora ne odgovara rundi." }, { status: 400 });
  }

  const name = normalizeName(String(body.name ?? ""));
  if (name.length < 2) {
    return NextResponse.json({ error: "Nedostaje ime." }, { status: 400 });
  }

  const team = normalizeName(String(body.team ?? ""));
  const key = playerKey(name);
  const sessionId = crypto.randomUUID();
  const finishedAt = new Date();

  // Server ponovo boduje iz tokena; bodovi koje je poslao klijent se ignorišu.
  let score = 0;
  let maxScore = 0;
  let correct = 0;
  let streak = 0;
  let bestStreak = 0;
  let totalTimeMs = 0;

  const answers: StoredAnswer[] = round.qs.map((q, i) => {
    const raw = (submitted[i] ?? {}) as { chosen?: unknown; timeMs?: unknown };
    const cfg = MODE_CONFIG[q.mode];
    const msTotal = cfg.seconds * 1000;

    const chosen =
      typeof raw.chosen === "number" && Number.isInteger(raw.chosen) && raw.chosen >= 0 && raw.chosen <= 5
        ? raw.chosen
        : null;

    const timeMs = Math.max(0, Math.min(msTotal, Math.round(Number(raw.timeMs) || 0)));
    const isCorrect = chosen !== null && chosen === q.correct;

    const points = scoreAnswer({
      mode: q.mode,
      isCorrect,
      msLeft: msTotal - timeMs,
      msTotal,
      streakBefore: streak,
      eliminationUsed: q.mode === "elimination" && timeMs >= ELIMINATION_AFTER * 1000,
    });

    score += points;
    maxScore += maxPointsFor(q.mode);
    totalTimeMs += timeMs;

    if (isCorrect) {
      correct += 1;
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 0;
    }

    // `chosen` je pozicija na ekranu (opcije su izmešane). `chosenOriginal` je index
    // u originalnom nizu iz questions.ts — bez njega se posle ne zna ŠTA je izabrao.
    const order = Array.isArray(q.order) ? q.order : null;
    const chosenOriginal = chosen !== null && order && order[chosen] !== undefined ? order[chosen] : null;

    return {
      sessionId,
      playerKey: key,
      questionId: q.id,
      topic: q.topic as TopicId,
      mode: q.mode,
      chosen,
      chosenOriginal,
      correctIdx: q.correct,
      isCorrect,
      timeMs,
      points,
      createdAt: finishedAt.toISOString(),
    };
  });

  const startedAtMs = Number(body.startedAt);
  const startedAt = Number.isFinite(startedAtMs)
    ? new Date(Math.min(startedAtMs, finishedAt.getTime()))
    : new Date(finishedAt.getTime() - totalTimeMs);

  const session: StoredSession = {
    id: sessionId,
    playerKey: key,
    playerName: name,
    team,
    kind: round.kind,
    total: round.qs.length,
    correct,
    score: Math.max(0, score),
    maxScore,
    percent: Math.round((correct / round.qs.length) * 1000) / 10,
    durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
    bestStreak,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
  };

  const store = getStore();
  let saved = true;
  try {
    await store.saveSession(session, answers);
  } catch (err) {
    saved = false;
    console.error("[result] Čuvanje rezultata nije uspelo:", err);
  }

  let progress = { mastered: [] as string[], weak: [] as string[], roundsPlayed: 0 };
  try {
    progress = await store.getProgress(key);
  } catch {
    /* napredak nije kritičan za prikaz rezultata */
  }

  return NextResponse.json({
    saved,
    sessionId,
    session,
    progress: {
      mastered: progress.mastered.length,
      weak: progress.weak.length,
      total: QUESTIONS.length,
      roundsPlayed: progress.roundsPlayed,
    },
  });
}
