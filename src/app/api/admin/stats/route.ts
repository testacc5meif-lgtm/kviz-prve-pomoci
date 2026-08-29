import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { buildStats } from "@/lib/stats";
import { ADMIN_COOKIE, verifyAdminCookie } from "@/lib/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "2026-08-30" → granica dana po lokalnom vremenu, kao ISO niz za poređenje. */
function dayBoundary(value: string | null, endOfDay: boolean): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function GET(req: Request) {
  const jar = await cookies();
  if (!verifyAdminCookie(jar.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const url = new URL(req.url);
  const from = dayBoundary(url.searchParams.get("from"), false);
  const to = dayBoundary(url.searchParams.get("to"), true);
  const detailFor = (url.searchParams.get("players") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);

  const store = getStore();
  try {
    await store.init();
    const all = await store.getAll();

    // Spisak svih takmičara ostaje NEfiltriran — da lista za čekiranje
    // ne nestane samo zato što neko nije igrao u izabranom periodu.
    const rosterMap = new Map<string, { key: string; name: string; team: string }>();
    for (const s of all.sessions) {
      const existing = rosterMap.get(s.playerKey);
      if (!existing || s.team) {
        rosterMap.set(s.playerKey, { key: s.playerKey, name: s.playerName, team: s.team });
      }
    }
    const roster = [...rosterMap.values()].sort((a, b) => a.name.localeCompare(b.name, "sr"));

    const sessions = all.sessions.filter(
      (s) => (!from || s.finishedAt >= from) && (!to || s.finishedAt <= to)
    );
    // Odgovore vezujemo za zadržane sesije — tako se runda nikad ne preseče na pola.
    const keptIds = new Set(sessions.map((s) => s.id));
    const answers = all.answers.filter((a) => keptIds.has(a.sessionId));

    const stats = buildStats(sessions, answers, store.driver, detailFor);

    return NextResponse.json({
      ...stats,
      roster,
      filter: { from: url.searchParams.get("from"), to: url.searchParams.get("to"), players: detailFor },
      unfilteredSessions: all.sessions.length,
    });
  } catch (err) {
    console.error("[admin/stats] Čitanje baze nije uspelo:", err);
    return NextResponse.json(
      { error: "Ne mogu da pročitam bazu. Proveri da li je DATABASE_URL podešen." },
      { status: 500 }
    );
  }
}
