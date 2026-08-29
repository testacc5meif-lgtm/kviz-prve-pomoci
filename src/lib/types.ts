export type TopicId =
  | "pristup"
  | "pregled"
  | "kpr"
  | "disajni"
  | "krvarenje"
  | "povrede"
  | "stanja"
  | "trovanja";

export type Question = {
  /** Stabilan ID — NIKADA ne menjati, na njega se vezuje istorija u bazi. */
  id: string;
  topic: TopicId;
  text: string;
  /** Uvek u originalnom redosledu iz testa; mešanje se radi u runtime-u. */
  options: string[];
  /** Index tačnog odgovora u `options`. */
  correct: number;
  /** Grupa "blizanaca" — dva pitanja iz iste grupe se nikada ne pojave u istoj rundi. */
  group?: string;
  /** Napomena koja se prikazuje tek POSLE odgovora (nejasni skenovi, kontradikcije). */
  note?: string;
  /** Emoji/simbol umesto fotografije koje nema u dokumentu. */
  visual?: string;
  /** Narandžasta ADR tablica za transport opasnih materija (gornji i donji broj). */
  plate?: { top: string; bottom: string };
};

export type GameMode = "classic" | "speed" | "elimination" | "double" | "lightning";

/** Pitanje pripremljeno za rundu — opcije su već izmešane. */
export type RoundQuestion = {
  id: string;
  topic: TopicId;
  text: string;
  options: string[];
  correct: number;
  mode: GameMode;
  note?: string;
  visual?: string;
  plate?: { top: string; bottom: string };
};

export type AnswerRecord = {
  questionId: string;
  topic: TopicId;
  mode: GameMode;
  /** null = isteklo vreme / bez odgovora */
  chosen: number | null;
  correctIdx: number;
  isCorrect: boolean;
  timeMs: number;
  points: number;
};

export type RoundKind = "round" | "retry";

export type SubmitPayload = {
  token: string;
  name: string;
  team: string;
  kind: RoundKind;
  startedAt: number;
  answers: { chosen: number | null; timeMs: number; points: number }[];
};

export type SessionRow = {
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
  finishedAt: string;
};

export type ProgressInfo = {
  mastered: string[];
  weak: string[];
  totalQuestions: number;
  roundsPlayed: number;
};
