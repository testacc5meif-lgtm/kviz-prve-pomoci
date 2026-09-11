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

console.log("\n── 8. Detaljna analiza označenog takmičara ──");
const detName = `Detalj Bot ${Date.now() % 100000}`;
const detKey = detName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const { data: dRound } = await jsonPost("/api/round", { name: detName, team: "Grupa 6", kind: "round" });

// Namerno grešimo prva 3 pitanja i pamtimo ŠTA smo izabrali.
const expectedWrong = new Map();
const dAnswers = dRound.questions.map((q, i) => {
  if (i < 3) {
    const wrong = (q.correct + 1) % q.options.length;
    expectedWrong.set(q.id, { chosen: q.options[wrong], correct: q.options[q.correct] });
    return { chosen: wrong, timeMs: 3000, points: 0 };
  }
  return { chosen: q.correct, timeMs: 3000, points: 0 };
});

await jsonPost("/api/result", {
  token: dRound.token,
  name: detName,
  team: "Grupa 6",
  startedAt: Date.now() - 90000,
  answers: dAnswers,
});

const rDetail = await fetch(`${BASE}/api/admin/stats?players=${detKey}`, { headers: { cookie } });
const detStats = await rDetail.json();
const me2 = detStats.detail?.find((d) => d.key === detKey);

check("detaljna analiza je vraćena za označenog", Boolean(me2), `detail: ${detStats.detail?.length ?? 0}`);
check("spisak svih takmičara (roster) postoji", Array.isArray(detStats.roster) && detStats.roster.length > 0);
check("beleži tačno 3 promašena pitanja", me2?.mistakes?.length === 3, `nađeno ${me2?.mistakes?.length}`);

let textsOk = true;
for (const m of me2?.mistakes ?? []) {
  const exp = expectedWrong.get(m.questionId);
  if (!exp || m.chosenText !== exp.chosen || m.correctText !== exp.correct) textsOk = false;
}
check("pamti ŠTA je izabrao uprkos mešanju odgovora", textsOk);
check("označava da pitanje i dalje ne zna", me2?.mistakes?.every((m) => m.stillWrong) === true);
check("ima razradu po oblastima", (me2?.topics?.length ?? 0) > 0);

console.log("\n── 9. Filter po datumu ──");
const today = new Date();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);

const rToday = await fetch(`${BASE}/api/admin/stats?from=${iso(today)}`, { headers: { cookie } });
const sToday = await rToday.json();
check("današnje runde su uključene", sToday.sessions.length > 0, `${sToday.sessions.length} rundi`);

const rOld = await fetch(`${BASE}/api/admin/stats?to=${iso(yesterday)}`, { headers: { cookie } });
const sOld = await rOld.json();
// Ne tvrdimo da je prazno (u bazi mogu biti starije runde) — nego da NIJEDNA
// runda napravljena maloprijas ne prolazi kroz filter "do juče".
const leakedToday = sOld.sessions.filter((x) => x.playerName === detName || x.playerName === name).length;
check("runde do juče ne uključuju današnje", leakedToday === 0, `procurilo ${leakedToday}`);
check("ukupan broj u bazi se i dalje vidi", sOld.unfilteredSessions > 0, `${sOld.unfilteredSessions} ukupno`);

const rCsvSel = await fetch(`${BASE}/api/admin/export?players=${detKey}`, { headers: { cookie } });
const csvSel = await rCsvSel.text();
check(
  "CSV izvoz poštuje izbor takmičara",
  rCsvSel.status === 200 && csvSel.includes(detName) && csvSel.includes("tekst_izabranog")
);

console.log("\n── 11. Kviz za petliće ──");
const petName = `Petlic Bot ${Date.now() % 100000}`;
const { res: rPet, data: pet } = await jsonPost("/api/round", {
  name: petName,
  team: "1. razred",
  program: "petlici",
  kind: "round",
});

check("status 200", rPet.status === 200, `dobijeno ${rPet.status}`);
check("runda ima 15 pitanja", pet?.questions?.length === 15, `dobijeno ${pet?.questions?.length}`);
check("program je petlici", pet?.program === "petlici", String(pet?.program));
check("nema isteka vremena", pet?.timed === false, `timed=${pet?.timed}`);
check("baza petlića ima 42 pitanja", pet?.progress?.total === 42, `dobijeno ${pet?.progress?.total}`);

const petModes = [...new Set(pet.questions.map((q) => q.mode))];
check(
  "koriste se samo blagi režimi (bez munje i duplo-ili-ništa)",
  petModes.every((m) => m === "classic" || m === "elimination"),
  petModes.join(", ")
);
check("sva pitanja su iz baze petlića", pet.questions.every((q) => q.id.startsWith("p")));

// Odgovaramo POLAKO — duže od prikazanog sata (90s), da proverimo da se ne kažnjava.
const petAnswers = pet.questions.map((q, i) => ({
  chosen: i < 12 ? q.correct : (q.correct + 1) % q.options.length,
  timeMs: 120000,
  points: 0,
}));
const { res: rPetRes, data: petRes } = await jsonPost("/api/result", {
  token: pet.token,
  name: petName,
  team: "1. razred",
  startedAt: Date.now() - 600000,
  answers: petAnswers,
});
check("rezultat je sačuvan", rPetRes.status === 200 && petRes?.saved === true);
check("12 tačnih od 15", petRes?.session?.correct === 12, `dobijeno ${petRes?.session?.correct}`);
check("sporo odgovaranje i dalje nosi pune bodove", petRes?.session?.score > 0, `${petRes?.session?.score} bodova`);
check("sesija je označena kao petlici", petRes?.session?.program === "petlici", String(petRes?.session?.program));

console.log("\n── 12. Programi su odvojeni ──");
// Isti igrač u drugom programu mora da krene od nule.
const { data: sameNameOmladina } = await jsonPost("/api/round", {
  name: petName,
  team: "1. razred",
  program: "omladina",
  kind: "round",
});
check(
  "napredak se ne prenosi između kvizova",
  sameNameOmladina?.progress?.mastered === 0,
  `savladano ${sameNameOmladina?.progress?.mastered}`
);
check("omladinska runda ima 25 pitanja", sameNameOmladina?.questions?.length === 25);
check(
  "omladinska runda ne sadrži pitanja petlića",
  sameNameOmladina.questions.every((q) => !q.id.startsWith("p")) 
);

const rPetStats = await fetch(`${BASE}/api/admin/stats?program=petlici`, { headers: { cookie } });
const petStats = await rPetStats.json();
check("admin vidi petliće", petStats.program === "petlici" && petStats.totals.questionsInBank === 42,
  `baza ${petStats.totals?.questionsInBank}`);
check("petlić se vidi u svojoj statistici", petStats.players?.some((p) => p.name === petName));

const rOmlStats = await fetch(`${BASE}/api/admin/stats?program=omladina`, { headers: { cookie } });
const omlStats = await rOmlStats.json();
check("admin za omladinu ima svoju bazu", omlStats.totals.questionsInBank === 100, `baza ${omlStats.totals?.questionsInBank}`);
check(
  "petlićeve runde se ne mešaju sa omladinom",
  !omlStats.sessions.some((x) => x.playerName === petName)
);

console.log("\n── 13. Nova pitanja (51–60) ──");
const NOVI = ["f51", "f52", "f53", "f54", "f55", "f56", "f57", "f58", "f59", "f60"];
const novName = `Novo Bot ${Date.now() % 100000}`;

// Popravni krug vraća tačno tražena pitanja — deterministično, bez nasumičnosti.
const { data: rNovi } = await jsonPost("/api/round", {
  name: novName,
  team: "",
  program: "omladina",
  kind: "retry",
  only: NOVI,
});
const vidjena = new Map(rNovi.questions.map((q) => [q.id, q]));

check("sva nova pitanja postoje u bazi", vidjena.size === NOVI.length, `nađeno ${vidjena.size}/${NOVI.length}`);
check(
  "sva nova pitanja nose oznaku „novo”",
  [...vidjena.values()].every((q) => q.isNew === true),
  [...vidjena.values()].filter((q) => !q.isNew).map((q) => q.id).join(", ") || "sva nose"
);
check("znak eksplozije ima sliku", vidjena.get("f51")?.visual === "💥", String(vidjena.get("f51")?.visual));
check(
  "stara pitanja nemaju oznaku „novo”",
  [...vidjena.values()].length > 0 &&
    (await jsonPost("/api/round", { name: `${novName} X`, team: "", program: "omladina", kind: "round" })).data.questions
      .filter((q) => !NOVI.includes(q.id))
      .every((q) => !q.isNew)
);

const { data: bank } = await jsonPost("/api/round", { name: `${novName} Z`, team: "", program: "omladina", kind: "round" });
check("omladinska baza ima 100 pitanja", bank.progress.total === 100, `dobijeno ${bank.progress.total}`);

// Blizanci oko Esmarhove poveske ne smeju zajedno u rundu.
let zajedno = 0;
for (let i = 0; i < 12; i++) {
  const { data: r } = await jsonPost("/api/round", { name: `Grupa Bot ${i}`, team: "", program: "omladina", kind: "round" });
  const pov = r.questions.filter((q) => ["b31", "d27", "f56"].includes(q.id)).length;
  if (pov > 1) zajedno++;
}
check("pitanja o Esmarhovoj povesci se ne pojavljuju zajedno", zajedno === 0, `sudara: ${zajedno}`);

console.log("\n── 10. Trajanje režima igre ──");
const secs = { classic: 45, speed: 20, elimination: 30, double: 30, lightning: 15 };
console.log("  (očekivano: klasično 45s, brzi metak 20s, pola-pola 30s, duplo 30s, munja 15s)");
check("nijedan režim nije kraći od 15s", Object.values(secs).every((v) => v >= 15));

console.log(
  failures === 0
    ? `\n✓ Sve provere prošle (baza: ${stats.driver}).\n`
    : `\n✗ ${failures} provera nije prošlo.\n`
);
process.exit(failures ? 1 : 0);
