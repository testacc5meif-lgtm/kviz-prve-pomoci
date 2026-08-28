import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { buildStats } from "@/lib/stats";
import { ADMIN_COOKIE, verifyAdminCookie } from "@/lib/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  if (!verifyAdminCookie(jar.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const store = getStore();
  try {
    await store.init();
    const { sessions, answers } = await store.getAll();
    return NextResponse.json(buildStats(sessions, answers, store.driver));
  } catch (err) {
    console.error("[admin/stats] Čitanje baze nije uspelo:", err);
    return NextResponse.json(
      { error: "Ne mogu da pročitam bazu. Proveri da li je DATABASE_URL podešen." },
      { status: 500 }
    );
  }
}
