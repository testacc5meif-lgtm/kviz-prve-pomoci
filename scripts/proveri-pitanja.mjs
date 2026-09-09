/**
 * Provera ispravnosti obe baze pitanja.
 * Pokretanje:  npm run proveri
 */
import { readFileSync } from "node:fs";

/** Iz TS fajla vadi imenovani niz i ocenjuje ga kao JS. */
function loadArray(file, declaration) {
  const src = readFileSync(new URL(file, import.meta.url), "utf8");
  const start = src.indexOf(declaration);
  if (start < 0) throw new Error(`Ne nalazim "${declaration}" u ${file}`);
  const arrStart = src.indexOf("[", start);
  const arrEnd = src.indexOf("\n];", arrStart);
  return eval(src.slice(arrStart, arrEnd + 2));
}

const BANKE = [
  { program: "omladina", pitanja: loadArray("../src/lib/questions.ts", "const OMLADINA") },
  { program: "petlici", pitanja: loadArray("../src/lib/questions-petlici.ts", "export const PETLICI") },
];

const problems = [];
const sviIdovi = new Set();

for (const { program, pitanja } of BANKE) {
  const stems = new Map();
  const groups = new Map();
  const byTopic = {};

  for (const q of pitanja) {
    if (sviIdovi.has(q.id)) problems.push(`Duplirani id: ${q.id} (id mora biti jedinstven u OBE baze)`);
    sviIdovi.add(q.id);

    if (!Array.isArray(q.options) || q.options.length < 2)
      problems.push(`${q.id}: mora imati bar 2 ponudjena odgovora`);

    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length)
      problems.push(`${q.id}: 'correct' (${q.correct}) je van opsega opcija`);

    const dupOpt = new Set(q.options.map((o) => o.trim().toLowerCase()));
    if (dupOpt.size !== q.options.length) problems.push(`${q.id}: ima dva identicna ponudjena odgovora`);

    if (!q.text || q.text.trim().length < 10) problems.push(`${q.id}: tekst pitanja je prekratak`);

    const stem = q.text.trim().toLowerCase().replace(/\s+/g, " ");
    const prev = stems.get(stem);
    if (prev && (q.group ?? `__${q.id}`) !== (prev.group ?? `__${prev.id}`))
      problems.push(`${q.id} i ${prev.id}: isti tekst pitanja, a nisu u istoj 'group'`);
    stems.set(stem, q);

    if (q.group) groups.set(q.group, (groups.get(q.group) ?? 0) + 1);
    byTopic[q.topic] = (byTopic[q.topic] ?? 0) + 1;
  }

  const blizanci = [...groups.values()].reduce((a, n) => a + (n - 1), 0);

  console.log(`\n── ${program.toUpperCase()} ──`);
  console.log(`  Pitanja: ${pitanja.length}`);
  console.log(`  Grupa blizanaca: ${groups.size}`);
  console.log(`  Jedinstvenih po rundi (bez blizanaca): ${pitanja.length - blizanci}`);
  console.log(`  Sa napomenom: ${pitanja.filter((q) => q.note).length}`);
  for (const [k, v] of Object.entries(byTopic).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(k).padEnd(12)} ${v}`);
  }
}

console.log(`\nUkupno pitanja u obe baze: ${BANKE.reduce((a, b) => a + b.pitanja.length, 0)}`);

if (problems.length) {
  console.error(`\n${problems.length} PROBLEMA:`);
  for (const p of problems) console.error("  ✗ " + p);
  process.exit(1);
}
console.log("\n✓ Obe baze pitanja su ispravne.");
