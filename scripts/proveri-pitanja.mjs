/**
 * Provera ispravnosti baze pitanja.
 * Pokretanje:  npm run proveri
 */
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/lib/questions.ts", import.meta.url), "utf8");

// Iz TS fajla vadimo samo niz QUESTIONS i ocenjujemo ga kao JS.
const start = src.indexOf("export const QUESTIONS");
const arrStart = src.indexOf("[", start);
const arrEnd = src.indexOf("\n];", arrStart);
const body = src.slice(arrStart, arrEnd + 2);
const QUESTIONS = eval(body);

const problems = [];
const ids = new Set();
const stems = new Map();
const groups = new Map();
const byTopic = {};

for (const q of QUESTIONS) {
  if (ids.has(q.id)) problems.push(`Duplirani id: ${q.id}`);
  ids.add(q.id);

  if (!Array.isArray(q.options) || q.options.length < 2)
    problems.push(`${q.id}: mora imati bar 2 ponudjena odgovora`);

  if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length)
    problems.push(`${q.id}: 'correct' (${q.correct}) je van opsega opcija`);

  const dupOpt = new Set(q.options.map((o) => o.trim().toLowerCase()));
  if (dupOpt.size !== q.options.length) problems.push(`${q.id}: ima dva identicna ponudjena odgovora`);

  if (!q.text || q.text.trim().length < 10) problems.push(`${q.id}: tekst pitanja je prekratak`);

  const stem = q.text.trim().toLowerCase().replace(/\s+/g, " ");
  if (stems.has(stem) && QUESTION_GROUP(q) !== QUESTION_GROUP(stems.get(stem)))
    problems.push(`${q.id} i ${stems.get(stem).id}: isti tekst pitanja, a nisu u istoj 'group'`);
  stems.set(stem, q);

  if (q.group) groups.set(q.group, (groups.get(q.group) ?? 0) + 1);
  byTopic[q.topic] = (byTopic[q.topic] ?? 0) + 1;
}

function QUESTION_GROUP(q) {
  return q.group ?? `__${q.id}`;
}

console.log(`Ukupno pitanja: ${QUESTIONS.length}`);
console.log(`Grupa blizanaca: ${groups.size} (pitanja u grupama: ${[...groups.values()].reduce((a, b) => a + b, 0)})`);
console.log(`Sa napomenom: ${QUESTIONS.filter((q) => q.note).length}`);
console.log("Po oblastima:");
for (const [k, v] of Object.entries(byTopic).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(k).padEnd(12)} ${v}`);
}

// Najveca grupa odredjuje koliko pitanja runda najvise moze da izgubi na blizance.
const maxRound = QUESTIONS.length - [...groups.values()].reduce((a, n) => a + (n - 1), 0);
console.log(`Jedinstvenih pitanja po rundi (bez blizanaca): ${maxRound}`);

if (problems.length) {
  console.error(`\n${problems.length} PROBLEMA:`);
  for (const p of problems) console.error("  ✗ " + p);
  process.exit(1);
}
console.log("\n✓ Baza pitanja je ispravna.");
