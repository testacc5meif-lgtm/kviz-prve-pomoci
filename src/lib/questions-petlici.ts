import type { Question } from "./types";

/** Pitanje bez `program` polja — program se dodaje pri spajanju u questions.ts. */
export type QuestionSeed = Omit<Question, "program">;

/**
 * BAZA PITANJA ZA PETLIĆE (1–4. razred)
 *
 * Izvor: „Kviz — Šta znaš o Crvenom krstu", plan radionica za 4. razred
 * osnovne škole, Crveni krst Beograd.
 *
 * PRETVORENA PITANJA — u originalu nisu bila sa ponuđenim odgovorima,
 * pa su prilagođena formatu kviza (tačan odgovor je iz dokumenta,
 * netačni su dodati):
 *   p06  — u originalu dopunjavanje („Anri Dinan")
 *   p34  — u originalu zaokruživanje više predmeta iz kutije prve pomoći
 *   p39–p42 — u originalu jedna rečenica sa prazninama za dopunu
 *
 * NIJE PRENETO: zadatak spajanja znakova sa brojevima (stranica 68) —
 * traži slike znakova kojih nema u dokumentu.
 */
export const PETLICI: QuestionSeed[] = [
  // ─────────────────────── UVOD U HUMANOST ───────────────────────
  {
    id: "p01",
    topic: "humanost",
    text: "Biti human znači biti:",
    options: [
      "čovekoljubiv, nesebičan, ljubazan, dobar, saosećajan sa drugima",
      "hrabar, bezbrižan, misaon, moralan",
      "kreativan, neustrašiv, inspirativan, izuzetan",
      "inovativan, vredan, blag, poliglota",
    ],
    correct: 0,
  },
  {
    id: "p02",
    topic: "humanost",
    text: "Danas na svetu živi više od sedam milijardi ljudi. Mnogo je važnije ono po čemu smo slični nego ono po čemu se razlikujemo. Ova tvrdnja je:",
    options: ["Tačna", "Netačna"],
    correct: 0,
  },
  {
    id: "p03",
    topic: "humanost",
    text: "Ljudski rod je izraz koji označava:",
    options: [
      "pojedince koji su povezani rodbinskim vezama",
      "članove šire lokalne zajednice",
      "ljude koji brinu o rodbini",
      "sve ljude na svetu",
    ],
    correct: 3,
  },
  {
    id: "p04",
    topic: "humanost",
    text: "Kome Crveni krst pomaže?",
    options: [
      "siromašnim ljudima",
      "žrtvama rata",
      "onima kojima je potrebna prva pomoć",
      "svim ljudima kojima je potrebna pomoć",
    ],
    correct: 3,
  },
  {
    id: "p05",
    topic: "humanost",
    text: "Humanost je glavna vrednost na koju se rad Crvenog krsta oslanja. Koja od ponuđenih reči odgovara pojmu HUMANOST?",
    options: ["hrabrost", "ljudskost", "efikasnost", "sigurnost"],
    correct: 1,
  },

  // ──────────────── ISTORIJAT I SASTAVNI DELOVI ────────────────
  {
    id: "p06",
    topic: "istorijat",
    text: "Kako se zvao idejni tvorac i osnivač Crvenog krsta?",
    options: ["Anri Dinan", "dr Vladan Đorđević", "Florens Najtingejl"],
    correct: 0,
    note: "Anri Dinan je bio švajcarski trgovac koji je, posle bitke kod Solferina, pokrenuo osnivanje Crvenog krsta.",
  },
  {
    id: "p07",
    topic: "istorijat",
    text: "U kom italijanskom mestu je Anri Dinan video strašnu bitku sa mnogo ranjenika?",
    options: ["u Veneciji", "u Solfeđu", "u Singidunumu", "u Solferinu"],
    correct: 3,
  },
  {
    id: "p08",
    topic: "istorijat",
    text: "Koje osnovne vrednosti Crvenog krsta su učvršćene tokom bitke kod tog mesta?",
    options: [
      "humanost, čovečnost, čestitost, saosećajnost",
      "humanost, neutralnost, nepristrasnost, dobrovoljnost",
      "humanost, volontiranje, moralnost, istoričnost",
      "čovekoljublje, efikasnost, milosrđe, idealizam",
    ],
    correct: 1,
  },
  {
    id: "p09",
    topic: "istorijat",
    text: "Na koliko osnovnih principa (vrednosti) počiva Crveni krst?",
    options: ["1", "3", "7", "10"],
    correct: 2,
  },
  {
    id: "p10",
    topic: "istorijat",
    text: "Koja su tri sastavna dela Crvenog krsta?",
    options: [
      "Komitet petorice, Svetski Crveni krst i Crveni krst Srbije",
      "Međunarodni komitet Crvenog krsta, nacionalna društva Crvenog krsta i Međunarodna federacija društava Crvenog krsta i Crvenog polumeseca",
      "Zaposleni u Crvenom krstu, volonteri Crvenog krsta i članovi Crvenog krsta",
      "Međunarodni Crveni krst, Državni Crveni krst i Crveni krst u opštinama",
    ],
    correct: 1,
  },
  {
    id: "p11",
    topic: "istorijat",
    text: "U kom švajcarskom gradu se nalaze međunarodna sedišta Crvenog krsta?",
    options: ["u Ženevi", "u Cirihu", "u Cermatu", "u Lucernu"],
    correct: 0,
  },
  {
    id: "p12",
    topic: "istorijat",
    text: "Kako je nastao znak crvenog krsta?",
    options: [
      "u znak poštovanja prema hrišćanskoj veri",
      "kao simbol otvorene kutije u koju se pakuje pomoć za siromašne ljude",
      "to je bilo toliko davno da se niko ne seća kako se to dogodilo",
      "obrnuta švajcarska zastava, u znak poštovanja prema zemlji rođenja Anrija Dinana",
    ],
    correct: 3,
  },
  {
    id: "p13",
    topic: "istorijat",
    text: "U nekim zemljama se umesto crvenog krsta koriste drugi znaci. Koji?",
    options: [
      "crveni orao i crveni mesec",
      "crveni polumesec i crveni kristal",
      "crveni dragulj i crveni mač",
      "crvena jabuka i crveni ždral",
    ],
    correct: 1,
  },
  {
    id: "p14",
    topic: "istorijat",
    text: "Koje godine je osnovan Crveni krst Srbije?",
    options: ["1870. godine", "1998. godine", "1941. godine", "1876. godine"],
    correct: 3,
  },
  {
    id: "p15",
    topic: "istorijat",
    text: "Kako se zvao osnivač Crvenog krsta Srbije?",
    options: ["Anri Dinan", "Ernest Hemingvej", "dr Vladislav Đurđević", "dr Vladan Đorđević"],
    correct: 3,
  },
  {
    id: "p16",
    topic: "istorijat",
    text: "Ko može da bude volonter u Crvenom krstu?",
    options: [
      "svi koji žele",
      "samo oni koji su završili fakultet",
      "samo nezaposleni, jer imaju dosta slobodnog vremena",
      "samo oni koje pozovu zaposleni u Crvenom krstu",
    ],
    correct: 0,
  },
  {
    id: "p17",
    topic: "istorijat",
    text: "Kog datuma se u celom svetu obeležava Dan Crvenog krsta?",
    options: ["9. januara", "8. maja", "16. jula", "11. septembra"],
    correct: 1,
  },
  {
    id: "p18",
    topic: "istorijat",
    text: "Crveni krst obezbeđuje:",
    options: [
      "pomoć u nesrećama (poplave, zemljotresi, oružani sukobi i sl.)",
      "pomoć siromašnim građanima",
      "jedinice krvi za bolesne",
      "obuke iz prve pomoći za sve građane",
      "sve navedeno i još više od toga",
    ],
    correct: 4,
  },

  // ──────────────── DOBROVOLJNO DAVALAŠTVO KRVI ────────────────
  {
    id: "p19",
    topic: "krv",
    text: "Koje su četiri osnovne krvne grupe kod ljudi?",
    options: ["A, B, BO, O", "A, B, AB, O", "BA, AB, A, O", "RH, OB, A, B"],
    correct: 1,
  },
  {
    id: "p20",
    topic: "krv",
    text: "Da li osoba mora da zna koja joj je krvna grupa da bi mogla da bude dobrovoljni davalac krvi?",
    options: ["Da", "Ne"],
    correct: 1,
  },
  {
    id: "p21",
    topic: "krv",
    text: "Da li osoba mora da zna koja joj je krvna grupa da bi mogla da primi transfuziju krvi?",
    options: ["Da", "Ne"],
    correct: 1,
  },
  {
    id: "p22",
    topic: "krv",
    text: "Koliko najmanje godina mora da ima neko ko hoće dobrovoljno da da krv?",
    options: ["12", "18", "21", "30"],
    correct: 1,
  },
  {
    id: "p23",
    topic: "krv",
    text: "Koliko često neko može da daje krv?",
    options: ["jednom u životu", "jednom godišnje", "dva puta godišnje", "četiri puta godišnje"],
    correct: 3,
    note: "Kod muškaraca razmak između dva davanja krvi je najmanje tri meseca.",
  },
  {
    id: "p24",
    topic: "krv",
    text: "Šta znači reč TRANSFUZIJA?",
    options: [
      "gubitak krvi usled ozbiljnih bolesti",
      "proces prenošenja krvi iz krvnog sistema jedne u krvni sistem druge osobe",
      "nedostatak crvenih krvnih zrnaca",
      "upotreba određenih vitamina i minerala u lečenju karcinoma",
    ],
    correct: 1,
  },
  {
    id: "p25",
    topic: "krv",
    text: "Koliko akcija davanja krvi dnevno u Srbiji organizuju Crveni krst i službe za transfuziju krvi?",
    options: ["10–30", "30–40", "40–45", "50–70"],
    correct: 3,
  },
  {
    id: "p26",
    topic: "krv",
    text: "Da li u Srbiji uvek ima dovoljno zaliha krvi?",
    options: ["Da", "Ne"],
    correct: 1,
  },
  {
    id: "p27",
    topic: "krv",
    text: "Koliko jedinica krvi je dnevno potrebno u Srbiji?",
    options: ["300", "1.000", "500", "70.500"],
    correct: 1,
  },
  {
    id: "p28",
    topic: "krv",
    text: "Kojim pacijentima je potrebna transfuzija krvi?",
    options: [
      "žrtvama saobraćajnih udesa",
      "onima koje čeka operacija",
      "pacijentima koji boluju od raka",
      "svima gore navedenim",
    ],
    correct: 3,
  },
  {
    id: "p29",
    topic: "krv",
    text: "Koliko često Crveni krst organizuje akcije dobrovoljnog davanja krvi?",
    options: [
      "čim se neko razboli, pa mu je potrebna transfuzija",
      "tokom masovnih katastrofalnih događaja",
      "kada se prijavi dovoljno dobrovoljnih davalaca",
      "svakodnevno",
    ],
    correct: 3,
  },

  // ──────────────────────── PRVA POMOĆ ────────────────────────
  {
    id: "p30",
    topic: "osnove",
    text: "Koji je broj telefona Hitne pomoći?",
    options: ["192", "914", "194", "193"],
    correct: 2,
    note: "194 je Hitna pomoć, 192 je policija, a 193 su vatrogasci.",
  },
  {
    id: "p31",
    topic: "osnove",
    text: "U kojoj situaciji NIJE potrebno zvati Hitnu pomoć?",
    options: [
      "osoba se guši",
      "osoba ima ozbiljnu alergijsku reakciju",
      "osoba obilno krvari",
      "osoba se posekla na papir",
    ],
    correct: 3,
  },
  {
    id: "p32",
    topic: "osnove",
    text: "Šta NIJE potrebno da kažeš kada pozoveš Hitnu pomoć?",
    options: ["svoje ime", "adresu najbliže bolnice", "svoju adresu", "zašto zoveš"],
    correct: 1,
  },
  {
    id: "p33",
    topic: "osnove",
    text: "U slučaju da se posečeš, šta treba da uradiš da zaustaviš krvarenje?",
    options: [
      "sačekaš da se rana osuši",
      "ispereš ranu pod mlazom vode iz česme",
      "obrišeš krv čistom gazom",
      "pritisneš ranu čistom gazom",
    ],
    correct: 3,
  },
  {
    id: "p34",
    topic: "osnove",
    text: "Šta od navedenog spada u sadržaj kutije za prvu pomoć?",
    options: [
      "makaze, ziherica, gaza, zavoj i rukavice",
      "sirup za kašalj, termometar, vata i flaster",
      "lekovi protiv bolova, alkohol, špric i igla",
    ],
    correct: 0,
  },
  {
    id: "p35",
    topic: "osnove",
    text: "Kako zaustaviti krvarenje iz nosa?",
    options: [
      "zabaciti glavu unazad i sačekati nekoliko minuta",
      "prstima što jače zapušiti obe nozdrve",
      "glavu pognuti napred i koren nosa pritisnuti pomoću dva prsta",
      "duvati na glavu",
    ],
    correct: 2,
  },
  {
    id: "p36",
    topic: "osnove",
    text: "Kako sanirati opekotinu?",
    options: [
      "namazati opekotinu uljem",
      "opečeno mesto staviti pod mlaz tople vode",
      "opečeno mesto držati pod mlazom hladne vode barem 10 minuta",
      "duvati u opečeno mesto dok bol ne prođe",
    ],
    correct: 2,
  },
  {
    id: "p37",
    topic: "osnove",
    text: "U kojoj organizaciji može besplatno da se pohađa obuka iz prve pomoći?",
    options: [
      "u lokalnom domu zdravlja ili bolnici",
      "u Hitnoj pomoći",
      "u Crvenom krstu",
      "ne postoje takve obuke",
    ],
    correct: 2,
  },
  {
    id: "p38",
    topic: "osnove",
    text: "Ako neka osoba dobije toplotni udar, šta ćeš da preduzmeš?",
    options: [
      "premestićeš je u hlad i staviti hladnu oblogu",
      "daješ joj da popije vodu",
      "daješ joj led da se rashladi",
      "sve gore nabrojano",
    ],
    correct: 0,
  },
  {
    id: "p39",
    topic: "osnove",
    text: "Na mestu nesreće treba da reagujete:",
    options: ["brzo", "polako, da ne biste pogrešili", "tek kada stigne neko stariji"],
    correct: 0,
  },
  {
    id: "p40",
    topic: "osnove",
    text: "Na mestu nesreće veoma je važno da budete:",
    options: ["smireni", "glasni, da vas svi čuju", "brži od svih ostalih"],
    correct: 0,
  },
  {
    id: "p41",
    topic: "osnove",
    text: "Kod povređene osobe prvo proveravaš:",
    options: ["da li je svesna i da li diše", "da li ima novac kod sebe", "koliko ima godina"],
    correct: 0,
  },
  {
    id: "p42",
    topic: "osnove",
    text: "Povređenu osobu i njenu odeću:",
    options: [
      "ne treba pomerati",
      "treba brzo pomeriti sa mesta nesreće",
      "treba skinuti da bi se videla povreda",
    ],
    correct: 0,
  },
];
