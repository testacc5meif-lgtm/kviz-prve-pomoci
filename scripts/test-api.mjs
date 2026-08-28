/**
 * Provera celog lanca preko HTTP-a: runda → bodovanje na serveru → upis → admin.
 * Pokretanje (uz pokrenut `npm run dev`):  node scripts/test-api.mjs
 */
const BASE = process.env.BASE ?? "http://localhost:3000";
const PASS = process.env.ADMIN_PASSWORD ?? "CrveniKrstMionica18";

let failures = 0;
function check(label, ok, extra = "") {
  console.log(`${ok ? "  ✓" : "  ✗"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures++;
}

async function jsonPost(path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* prazan odgovor */
  }
  return { res, data };
}

console.log("\n── 1. Dohvatanje runde ──");
const name = `Test Bot ${Date.now() % 100000}`;
const { res: r1, data: round } = await jsonPost("/api/round", { name, team: "Test ekipa", kind: "round" });

check("status 200", r1.status === 200, `dobijeno ${r1.status}`);
check("stiglo 25 pitanja", round?.questions?.length === 25, `dobijeno ${round?.questions?.length}`);
check("stigao potpisan token", typeof round?.token === "string" && round.token.length > 40);

const ids = round.questions.map((q) => q.id);
check("nema dupliranih pitanja u rundi", new Set(ids).size === ids.length);

const modes = [...new Set(round.questions.map((q) => q.mode))];
check("runda ima više režima igre", modes.length >= 3, modes.join(", "));
check("poslednje pitanje je „Munja”", round.questions.at(-1).mode === "lightning", round.questions.at(-1).mode);

const idxInRange = round.questions.every((q) => q.correct >= 0 && q.correct < q.options.length);
check("indeks tačnog odgovora je u opsegu", idxInRange);

console.log("\n── 2. Mešanje ponuđenih odgovora ──");
const { data: round2 } = await jsonPost("/api/round", { name: name + " B", team: "", kind: "round" });
const byId = new Map(round2.questions.map((q) => [q.id, q]));
let compared = 0;
let differed = 0;
for (const q of round.questions) {
  const other = byId.get(q.id);
  if (!other) continue;
  compared++;
  if (JSON.stringify(q.options) !== JSON.stringify(other.options)) differed++;
}
check(
  "isto pitanje dolazi sa drugačijim redosledom odgovora",
  compared === 0 || differed > 0,
  `${differed}/${compared} poređenih pitanja ima drugačiji redosled`
);

console.log("\n── 3. Slanje rezultata (20 tačnih, 5 netačnih) ──");
const answers = round.questions.map((q, i) => {
  const wrong = (q.correct + 1) % q.options.length;
  return { chosen: i < 20 ? q.correct : wrong, timeMs: 2000, points: 999999 };
});

const { res: r3, data: result } = await jsonPost("/api/result", {
  token: round.token,
  name,
  team: "Test ekipa",
  startedAt: Date.now() - 120000,
  answers,
});

check("status 200", r3.status === 200, `dobijeno ${r3.status}`);
check("rezultat je sačuvan", result?.saved === true);
check("20 tačnih odgovora", result?.session?.correct === 20, `dobijeno ${result?.session?.correct}`);
check("procenat je 80", result?.session?.percent === 80, `dobijeno ${result?.session?.percent}`);
check(
  "server ignoriše bodove koje šalje klijent",
  result?.session?.score !== 999999 * 25 && result?.session?.score > 0,
  `sačuvano ${result?.session?.score} bodova`
);
check("napredak je ažuriran", result?.progress?.mastered === 20, `savladano ${result?.progress?.mastered}`);
check("slaba pitanja su zabeležena", result?.progress?.weak === 5, `slabih ${result?.progress?.weak}`);

console.log("\n── 4. Sledeća runda izbegava savladana pitanja ──");
const { data: round3 } = await jsonPost("/api/round", { name, team: "Test ekipa", kind: "round" });
const mastered = new Set(ids.slice(0, 20));
const repeats = round3.questions.filter((q) => mastered.has(q.id)).length;
check(
  "savladana pitanja se ne ponavljaju dok ima neviđenih",
  repeats === 0,
  `ponovljenih savladanih: ${repeats}`
);

console.log("\n── 5. Popravni krug ──");
const weakIds = round.questions.slice(20).map((q) => q.id);
const { res: r5, data: retry } = await jsonPost("/api/round", {
  name,
  team: "Test ekipa",
  kind: "retry",
  only: weakIds,
});
check("status 200", r5.status === 200);
check("vraća tačno tražena pitanja", retry?.questions?.length === 5, `dobijeno ${retry?.questions?.length}`);
check(
  "popravni sadrži samo pogrešena pitanja",
  retry.questions.every((q) => weakIds.includes(q.id))
);

console.log("\n── 6. Zaštita od lažiranja rezultata ──");
const { res: rBad } = await jsonPost("/api/result", {
  token: round.token.slice(0, -4) + "AAAA",
  name,
  team: "",
  startedAt: Date.now(),
  answers,
});
check("izmenjen token je odbijen", rBad.status === 400, `dobijeno ${rBad.status}`);

const { res: rShort } = await jsonPost("/api/result", {
  token: round.token,
  name,
  team: "",
  startedAt: Date.now(),
  answers: answers.slice(0, 3),
});
check("pogrešan broj odgovora je odbijen", rShort.status === 400, `dobijeno ${rShort.status}`);

const { res: rNoName } = await jsonPost("/api/round", { name: "X", team: "", kind: "round" });
check("prekratko ime je odbijeno", rNoName.status === 400, `dobijeno ${rNoName.status}`);

console.log("\n── 7. Admin ──");
const { res: rNoAuth } = await fetch(BASE + "/api/admin/stats").then((r) => ({ res: r }));
check("statistika bez prijave je zabranjena", rNoAuth.status === 401, `dobijeno ${rNoAuth.status}`);

const { res: rWrongPass } = await jsonPost("/api/admin/login", { password: "pogresna" });
check("pogrešna lozinka je odbijena", rWrongPass.status === 401, `dobijeno ${rWrongPass.status}`);

const rLogin = await fetch(BASE + "/api/admin/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: PASS }),
});
check("ispravna lozinka prolazi", rLogin.status === 200, `dobijeno ${rLogin.status}`);

const cookie = (rLogin.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
check("kolačić je postavljen", cookie.includes("ck_admin"));

const rStats = await fetch(BASE + "/api/admin/stats", { headers: { cookie } });
const stats = await rStats.json();
check("statistika je dostupna", rStats.status === 200, `dobijeno ${rStats.status}`);
check("sesija se vidi u statistici", stats.sessions?.some((s) => s.playerName === name));
check("takmičar se vidi u statistici", stats.players?.some((p) => p.name === name));
check("ima statistike po pitanjima", stats.questions?.some((q) => q.asked > 0));
check("ima statistike po oblastima", stats.topics?.some((t) => t.asked > 0));
check("ima statistike po režimima", stats.modes?.some((m) => m.asked > 0));

const me = stats.players.find((p) => p.name === name);
check("pokrivenost je izračunata", typeof me?.coverage === "number" && me.coverage > 0, `${me?.coverage}%`);

const rCsv = await fetch(BASE + "/api/admin/export", { headers: { cookie } });
const csv = await rCsv.text();
check("CSV izvoz radi", rCsv.status === 200 && csv.includes("id_pitanja"), `${csv.split("\n").length} redova`);

console.log(
  failures === 0
    ? `\n✓ Sve provere prošle (baza: ${stats.driver}).\n`
    : `\n✗ ${failures} provera nije prošlo.\n`
);
process.exit(failures ? 1 : 0);
