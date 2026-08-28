import crypto from "node:crypto";
import type { GameMode, RoundKind } from "./types";

/**
 * Runda se klijentu šalje zajedno sa potpisanim tokenom.
 *
 * Token sadrži tačne odgovore i režime igre. Kada klijent pošalje rezultat,
 * server iz tokena SAM ponovo izračuna bodove — poslati bodovi se ignorišu.
 * Tako niko ne može da kroz API ubaci lažni rezultat od 100%.
 */

export type RoundToken = {
  qs: { id: string; topic: string; correct: number; mode: GameMode }[];
  kind: RoundKind;
  playerKey: string;
  issuedAt: number;
};

/** Token važi 3 sata — dovoljno za rundu, prekratko da se reciklira. */
const MAX_AGE_MS = 3 * 60 * 60 * 1000;

function secret(): string {
  return (
    process.env.QUIZ_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "crveni-krst-mionica-lokalni-razvoj"
  );
}

const b64url = (buf: Buffer) => buf.toString("base64url");

function hmac(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

export function signRound(payload: RoundToken): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${body}.${hmac(body)}`;
}

export function verifyRound(token: string): RoundToken | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = hmac(body);

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as RoundToken;
    if (!Array.isArray(payload.qs) || typeof payload.issuedAt !== "number") return null;
    if (Date.now() - payload.issuedAt > MAX_AGE_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ─────────────────────── admin sesija ─────────────────────── */

export const ADMIN_COOKIE = "ck_admin";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "CrveniKrstMionica18";
}

export function issueAdminCookie(): string {
  const until = Date.now() + 8 * 60 * 60 * 1000;
  return `${until}.${hmac(`admin:${until}`)}`;
}

export function verifyAdminCookie(value: string | undefined): boolean {
  if (!value) return false;

  const dot = value.indexOf(".");
  if (dot < 1) return false;

  const until = Number(value.slice(0, dot));
  if (!Number.isFinite(until) || Date.now() > until) return false;

  const a = Buffer.from(value.slice(dot + 1));
  const b = Buffer.from(hmac(`admin:${until}`));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Poređenje lozinke otporno na merenje vremena. */
export function passwordMatches(input: unknown): boolean {
  if (typeof input !== "string") return false;
  const a = Buffer.from(input);
  const b = Buffer.from(adminPassword());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
