import { NextResponse } from "next/server";
import { ADMIN_COOKIE, issueAdminCookie, passwordMatches } from "@/lib/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neispravan zahtev." }, { status: 400 });
  }

  if (!passwordMatches(body.password)) {
    // Mala pauza da usporimo pogađanje lozinke.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Pogrešna lozinka." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: issueAdminCookie(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return res;
}
