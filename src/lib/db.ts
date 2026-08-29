import { promises as fs } from "node:fs";
import path from "node:path";
import type { RoundKind } from "./types";

/**
 * SKLADIŠTE REZULTATA
 *
 * Dva drajvera, isti interfejs:
 *
 *  • "postgres" — kada postoji DATABASE_URL / POSTGRES_URL.
 *    Ovo je ono što radi na Vercelu. Na Vercelu ide: Storage → Neon (Postgres)
 *    → "Connect Project". Vercel sam ubaci DATABASE_URL u env varijable.
 *
 *  • "file" — lokalni .data/quiz.json, samo za razvoj na tvom računaru.
 *    Na Vercelu fajl sistem NIJE trajan, pa se ovaj drajver tamo ne koristi.
 *
 * Zašto Postgres a ne Google Sheets: rezultati su relacioni (sesija → odgovori),
 * treba nam brzo filtriranje po igraču i po pitanju za statistiku, a Sheets
 * puca na limitima API-ja i nema transakcije.
 */

export type StoredSession = {
  id: string;
  playerKey: string;
  playerName: string;
  team: string;
  kind: RoundKind;
  total: number;
  correct: number;
  score: number;
  maxScore: number;
  percent: number;
  durationMs: number;
  bestStreak: number;
  startedAt: string;
  finishedAt: string;
};

export type StoredAnswer = {
  sessionId: string;
  playerKey: string;
  questionId: string;
  topic: string;
  mode: string;
  /** Pozicija dugmeta na ekranu (opcije su izmešane). */
  chosen: number | null;
  /** Index u originalnom nizu opcija iz questions.ts — za prikaz šta je tačno izabrao. */
  chosenOriginal: number | null;
  correctIdx: number;
  isCorrect: boolean;
  timeMs: number;
  points: number;
  createdAt: string;
};

export type Store = {
  driver: "postgres" | "file";
  init(): Promise<void>;
  saveSession(session: StoredSession, answers: StoredAnswer[]): Promise<void>;
  getProgress(playerKey: string): Promise<{ mastered: string[]; weak: string[]; roundsPlayed: number }>;
  getAll(): Promise<{ sessions: StoredSession[]; answers: StoredAnswer[] }>;
};

function connectionString(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    undefined
  );
}

/* ─────────────────────────── Postgres ─────────────────────────── */

type SqlTag = <T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T[]>;

let pgReady: Promise<void> | null = null;

function createPostgresStore(url: string): Store {
  // Dinamički import da lokalni razvoj bez baze ne mora ni da učita drajver.
  const getSql = async (): Promise<SqlTag> => {
    const { neon } = await import("@neondatabase/serverless");
    return neon(url) as unknown as SqlTag;
  };

  const init = async () => {
    if (!pgReady) {
      pgReady = (async () => {
        const sql = await getSql();
        await sql`
          CREATE TABLE IF NOT EXISTS quiz_sessions (
            id            TEXT PRIMARY KEY,
            player_key    TEXT NOT NULL,
            player_name   TEXT NOT NULL,
            team          TEXT NOT NULL DEFAULT '',
            kind          TEXT NOT NULL,
            total         INTEGER NOT NULL,
            correct       INTEGER NOT NULL,
            score         INTEGER NOT NULL,
            max_score     INTEGER NOT NULL,
            percent       REAL NOT NULL,
            duration_ms   INTEGER NOT NULL,
            best_streak   INTEGER NOT NULL,
            started_at    TIMESTAMPTZ NOT NULL,
            finished_at   TIMESTAMPTZ NOT NULL DEFAULT now()
          )`;
        await sql`
          CREATE TABLE IF NOT EXISTS quiz_answers (
            id            BIGSERIAL PRIMARY KEY,
            session_id    TEXT NOT NULL,
            player_key    TEXT NOT NULL,
            question_id   TEXT NOT NULL,
            topic         TEXT NOT NULL,
            mode          TEXT NOT NULL,
            chosen           INTEGER,
            chosen_original  INTEGER,
            correct_idx      INTEGER NOT NULL,
            is_correct    BOOLEAN NOT NULL,
            time_ms       INTEGER NOT NULL,
            points        INTEGER NOT NULL,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
          )`;
        // Za baze napravljene pre nego što je kolona dodata.
        await sql`ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS chosen_original INTEGER`;
        await sql`CREATE INDEX IF NOT EXISTS quiz_answers_player ON quiz_answers (player_key)`;
        await sql`CREATE INDEX IF NOT EXISTS quiz_answers_created ON quiz_answers (created_at)`;
        await sql`CREATE INDEX IF NOT EXISTS quiz_sessions_finished ON quiz_sessions (finished_at)`;
        await sql`CREATE INDEX IF NOT EXISTS quiz_answers_question ON quiz_answers (question_id)`;
        await sql`CREATE INDEX IF NOT EXISTS quiz_answers_session ON quiz_answers (session_id)`;
        await sql`CREATE INDEX IF NOT EXISTS quiz_sessions_player ON quiz_sessions (player_key)`;
      })().catch((err) => {
        pgReady = null;
        throw err;
      });
    }
    return pgReady;
  };

  return {
    driver: "postgres",
    init,

    async saveSession(s, answers) {
      await init();
      const sql = await getSql();
      await sql`
        INSERT INTO quiz_sessions
          (id, player_key, player_name, team, kind, total, correct, score, max_score,
           percent, duration_ms, best_streak, started_at, finished_at)
        VALUES
          (${s.id}, ${s.playerKey}, ${s.playerName}, ${s.team}, ${s.kind}, ${s.total},
           ${s.correct}, ${s.score}, ${s.maxScore}, ${s.percent}, ${s.durationMs},
           ${s.bestStreak}, ${s.startedAt}, ${s.finishedAt})
        ON CONFLICT (id) DO NOTHING`;

      for (const a of answers) {
        await sql`
          INSERT INTO quiz_answers
            (session_id, player_key, question_id, topic, mode, chosen, chosen_original,
             correct_idx, is_correct, time_ms, points, created_at)
          VALUES
            (${a.sessionId}, ${a.playerKey}, ${a.questionId}, ${a.topic}, ${a.mode},
             ${a.chosen}, ${a.chosenOriginal}, ${a.correctIdx}, ${a.isCorrect},
             ${a.timeMs}, ${a.points}, ${a.createdAt})`;
      }
    },

    async getProgress(key) {
      await init();
      const sql = await getSql();
      // Poslednji odgovor po pitanju određuje da li je pitanje savladano.
      const rows = await sql<{ question_id: string; is_correct: boolean }>`
        SELECT DISTINCT ON (question_id) question_id, is_correct
        FROM quiz_answers
        WHERE player_key = ${key}
        ORDER BY question_id, created_at DESC, id DESC`;
      const counted = await sql<{ n: string }>`
        SELECT COUNT(*)::text AS n FROM quiz_sessions WHERE player_key = ${key} AND kind = 'round'`;

      return {
        mastered: rows.filter((r) => r.is_correct).map((r) => r.question_id),
        weak: rows.filter((r) => !r.is_correct).map((r) => r.question_id),
        roundsPlayed: Number(counted[0]?.n ?? 0),
      };
    },

    async getAll() {
      await init();
      const sql = await getSql();
      const sessions = await sql<Record<string, unknown>>`
        SELECT * FROM quiz_sessions ORDER BY finished_at DESC`;
      const answers = await sql<Record<string, unknown>>`
        SELECT * FROM quiz_answers ORDER BY created_at ASC, id ASC`;

      return {
        sessions: sessions.map(
          (r): StoredSession => ({
            id: String(r.id),
            playerKey: String(r.player_key),
            playerName: String(r.player_name),
            team: String(r.team ?? ""),
            kind: r.kind as RoundKind,
            total: Number(r.total),
            correct: Number(r.correct),
            score: Number(r.score),
            maxScore: Number(r.max_score),
            percent: Number(r.percent),
            durationMs: Number(r.duration_ms),
            bestStreak: Number(r.best_streak),
            startedAt: new Date(r.started_at as string).toISOString(),
            finishedAt: new Date(r.finished_at as string).toISOString(),
          })
        ),
        answers: answers.map(
          (r): StoredAnswer => ({
            sessionId: String(r.session_id),
            playerKey: String(r.player_key),
            questionId: String(r.question_id),
            topic: String(r.topic),
            mode: String(r.mode),
            chosen: r.chosen === null || r.chosen === undefined ? null : Number(r.chosen),
            chosenOriginal:
              r.chosen_original === null || r.chosen_original === undefined
                ? null
                : Number(r.chosen_original),
            correctIdx: Number(r.correct_idx),
            isCorrect: Boolean(r.is_correct),
            timeMs: Number(r.time_ms),
            points: Number(r.points),
            createdAt: new Date(r.created_at as string).toISOString(),
          })
        ),
      };
    },
  };
}

/* ─────────────────────── Lokalni JSON fajl ─────────────────────── */

const FILE = path.join(process.cwd(), ".data", "quiz.json");
let writeChain: Promise<unknown> = Promise.resolve();

async function readFileStore(): Promise<{ sessions: StoredSession[]; answers: StoredAnswer[] }> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as { sessions?: StoredSession[]; answers?: StoredAnswer[] };
    return { sessions: parsed.sessions ?? [], answers: parsed.answers ?? [] };
  } catch {
    return { sessions: [], answers: [] };
  }
}

function createFileStore(): Store {
  return {
    driver: "file",
    async init() {
      await fs.mkdir(path.dirname(FILE), { recursive: true });
    },

    async saveSession(session, answers) {
      // Serijalizujemo upise da dva istovremena zahteva ne pregaze fajl.
      writeChain = writeChain.then(async () => {
        await fs.mkdir(path.dirname(FILE), { recursive: true });
        const data = await readFileStore();
        if (data.sessions.some((s) => s.id === session.id)) return;
        data.sessions.unshift(session);
        data.answers.push(...answers);
        await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8");
      });
      await writeChain;
    },

    async getProgress(key) {
      const { sessions, answers } = await readFileStore();
      const last = new Map<string, boolean>();
      for (const a of answers.filter((a) => a.playerKey === key)) {
        last.set(a.questionId, a.isCorrect); // niz je hronološki, poslednji pobeđuje
      }
      return {
        mastered: [...last].filter(([, ok]) => ok).map(([id]) => id),
        weak: [...last].filter(([, ok]) => !ok).map(([id]) => id),
        roundsPlayed: sessions.filter((s) => s.playerKey === key && s.kind === "round").length,
      };
    },

    getAll: readFileStore,
  };
}

let cached: Store | null = null;

export function getStore(): Store {
  if (!cached) {
    const url = connectionString();
    cached = url ? createPostgresStore(url) : createFileStore();
  }
  return cached;
}
