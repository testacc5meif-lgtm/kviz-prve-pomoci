import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { answersToCsv } from "@/lib/stats";
import { ADMIN_COOKIE, verifyAdminCookie } from "@/lib/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  if (!verifyAdminCookie(jar.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  try {
    const store = getStore();
    await store.init();
    const { sessions, answers } = await store.getAll();
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(answersToCsv(sessions, answers), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kviz-prva-pomoc-${date}.csv"`,
      },
    });
  } catch (err) {
    console.error("[admin/export] Izvoz nije uspeo:", err);
    return NextResponse.json({ error: "Izvoz nije uspeo." }, { status: 500 });
  }
}
