import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { answersToCsv } from "@/lib/stats";
import { ADMIN_COOKIE, verifyAdminCookie } from "@/lib/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const only = new Set(
    (url.searchParams.get("players") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  try {
    const store = getStore();
    await store.init();
    const all = await store.getAll();

    // Izvoz poštuje iste filtere kao i ekran — da se ne razilaze.
    const sessions = all.sessions.filter(
      (s) =>
        (!from || s.finishedAt >= from) &&
        (!to || s.finishedAt <= to) &&
        (only.size === 0 || only.has(s.playerKey))
    );
    const keptIds = new Set(sessions.map((s) => s.id));
    const answers = all.answers.filter((a) => keptIds.has(a.sessionId));

    const stamp = new Date().toISOString().slice(0, 10);
    const suffix = only.size ? "-izabrani" : "";

    return new NextResponse(answersToCsv(sessions, answers), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kviz-prva-pomoc-${stamp}${suffix}.csv"`,
      },
    });
  } catch (err) {
    console.error("[admin/export] Izvoz nije uspeo:", err);
    return NextResponse.json({ error: "Izvoz nije uspeo." }, { status: 500 });
  }
}
