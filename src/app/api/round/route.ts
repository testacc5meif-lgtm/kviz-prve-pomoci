import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { QUESTIONS } from "@/lib/questions";
import { ROUND_SIZE, buildRound, normalizeName, playerKey } from "@/lib/quiz";
import { signRound } from "@/lib/token";
import type { RoundKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { name?: unknown; team?: unknown; kind?: unknown; only?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neispravan zahtev." }, { status: 400 });
  }

  const name = normalizeName(String(body.name ?? ""));
  if (name.length < 2) {
    return NextResponse.json({ error: "Ime mora imati bar 2 slova." }, { status: 400 });
  }

  const kind: RoundKind = body.kind === "retry" ? "retry" : "round";
  const key = playerKey(name);

  const only =
    kind === "retry" && Array.isArray(body.only)
      ? body.only.filter((id): id is string => typeof id === "string").slice(0, ROUND_SIZE)
      : undefined;

  if (kind === "retry" && (!only || only.length === 0)) {
    return NextResponse.json({ error: "Nema pitanja za popravku." }, { status: 400 });
  }

  // Kviz mora da radi i ako baza trenutno nije dostupna — samo bez napretka.
  let progress = { mastered: [] as string[], weak: [] as string[], roundsPlayed: 0 };
  let dbOk = true;
  try {
    progress = await getStore().getProgress(key);
  } catch (err) {
    dbOk = false;
    console.error("[round] Ne mogu da pročitam napredak:", err);
  }

  const questions = buildRound({
    count: only ? only.length : ROUND_SIZE,
    mastered: new Set(progress.mastered),
    weak: new Set(progress.weak),
    seed: (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0,
    only,
  });

  if (questions.length === 0) {
    return NextResponse.json({ error: "Nema dostupnih pitanja." }, { status: 500 });
  }

  const token = signRound({
    qs: questions.map((q) => ({ id: q.id, topic: q.topic, correct: q.correct, mode: q.mode })),
    kind,
    playerKey: key,
    issuedAt: Date.now(),
  });

  return NextResponse.json({
    questions,
    token,
    dbOk,
    progress: {
      mastered: progress.mastered.length,
      weak: progress.weak.length,
      total: QUESTIONS.length,
      roundsPlayed: progress.roundsPlayed,
    },
  });
}
