# Kviz Crvenog krsta — Mionica

Interaktivni trening kviz sa **dva odvojena programa**. Na ulazu se bira koji se radi.

| | 🐣 Petlići (1–4. razred) | 🎽 Omladina i podmladak |
|---|---|---|
| Gradivo | Šta znaš o Crvenom krstu — humanost, istorijat, davalaštvo krvi, osnove prve pomoći | Takmičarski test prve pomoći |
| Pitanja u bazi | 42 | 90 |
| Po rundi | 15 | 25 |
| Vreme | **sat odbrojava, ali pitanje ne ističe** | svako pitanje ima svoje vreme |
| Režimi igre | Klasično, Pola-pola | svih 5 režima |

Zajedničko za oba:

- **Ponuđeni odgovori se mešaju** svaki put — deca ne mogu da pamte „drugi odgovor je tačan"
- **Praćenje napretka po igraču** — sledeća runda donosi pitanja koja još nisu savladana
- **Popravni krug** — na kraju runde možeš odmah ponoviti samo ono što nisi znao
- **Odvojena istorija** — isti takmičar u drugom programu kreće od nule

---

## Zašto petlići nemaju istek vremena

Prvaci i drugaci sporo čitaju. Sat se i dalje vidi i odbrojava od 90 sekundi (da bude
igra), ali kad dođe do nule **ništa se ne dešava** — prsten pređe u mirnu plavu boju,
pokaže smajli i pitanje čeka koliko god treba. Nema kaznenih poena, nema režima
„Duplo ili ništa" ni „Munja". Brži odgovor i dalje nosi mali bonus.

---

## Pokretanje na računaru

```bash
npm install
```

```bash
npm run dev
```

Otvori http://localhost:3000

Bez podešene baze, rezultati se lokalno čuvaju u `.data/quiz.json`.
Da obrišeš lokalne rezultate, samo obriši taj fajl.

### Korisne komande

```bash
npm run proveri
```

Proverava **obe** baze pitanja (duplirani ID-jevi, indeksi tačnih odgovora, prazne opcije).
**Pokreni ovo svaki put kad dodaš nova pitanja.**

```bash
node scripts/test-api.mjs
```

Prolazi kroz ceo lanac — obe runde, bodovanje, upis i admin. Zahteva pokrenut `npm run dev`.

---

## Objavljivanje na Vercel

### 1. Postavi projekat

Ubaci folder na GitHub, pa na [vercel.com](https://vercel.com) → **Add New → Project** →
izaberi repozitorijum. Vercel sam prepozna Next.js, ništa ne treba menjati.

### 2. Dodaj bazu (obavezno!)

Bez baze rezultati se **neće trajno čuvati** — Vercel briše fajlove posle svakog zahteva.

U Vercel projektu: **Storage → Create Database → Neon (Postgres) → Connect Project**.

Vercel će sam dodati `DATABASE_URL` među env varijable. Tabele se prave automatski
pri prvom upisu — ništa ne moraš ručno da kucaš.

### 3. Podesi env varijable

U **Settings → Environment Variables** dodaj:

| Ime | Vrednost | Čemu služi |
|---|---|---|
| `ADMIN_PASSWORD` | `CrveniKrstMionica18` | lozinka za `/admin` |
| `QUIZ_SECRET` | bilo koji dug nasumičan niz | potpisuje runde i admin sesiju |

Ako ih ne postaviš, radi i dalje sa podrazumevanim vrednostima — ali **postavi ih**,
jer je podrazumevana tajna javna (nalazi se u kodu).

### 4. Deploy

Svaki `git push` automatski objavljuje novu verziju.

---

## Admin panel

Na `/admin`, lozinka: **`CrveniKrstMionica18`** (ili ono što staviš u `ADMIN_PASSWORD`).

Gore stoji **prekidač kviza** — `🎽 Omladina` / `🐣 Petlići`. Sve ispod se odnosi
samo na izabrani kviz; dve baze pitanja se nikada ne mešaju u istoj statistici.

Šta se vidi:

- **Pregled** — broj takmičara, rundi, prosečan rezultat, rang lista
- **⭐ Moja grupa** — označiš koga pratiš (npr. onih 6 takmičara) i dobijaš dva nivoa:

  **1) Zajednički izveštaj cele grupe:** prosek grupe, prosečna pokrivenost baze,
  koje oblasti im najslabije idu, i spisak **pitanja koja grupa ne zna** — sortiran
  po tome koliko članova ga i dalje ne zna („4 od 6 još ne zna"). Klik na pitanje
  otvara **ko je tačno promašio i šta je svako od njih izabrao**.

  **2) Pojedinačno po takmičaru:** sklopljene kartice (jedan red po osobi) koje se
  otvaraju na klik — svako pitanje koje je promašio, šta je izabrao, tačan odgovor,
  koliko puta ga je promašio, razrada po oblastima i spisak svih njegovih rundi.

  Izbor praćenih osoba pamti se odvojeno za svaki kviz.
- **Svi takmičari** — tabela sa čekiranjem za praćenje
- **Sve runde** — svaka odigrana runda pojedinačno
- **Pitanja** — sortirano od najtežih ka najlakšim, sa procentom tačnosti po pitanju
- **Analiza** — uspeh po oblastima, po režimima igre, aktivnost po danima
  (klik na stubić prikazuje samo taj dan)
- **CSV izvoz** — svaki pojedinačni odgovor sa tekstom izabranog odgovora; poštuje
  izabrani kviz, period i označene takmičare

### Filter po periodu

Traka **Period**: `Sve vreme` / `Danas` / `7 dana` / `30 dana`, plus polja
**Od** i **Do** za bilo koji raspon. Dani se računaju po lokalnom vremenu.

---

## Dodavanje novih pitanja

Dve odvojene baze:

| Program | Fajl | Prefiks ID-ja |
|---|---|---|
| Omladina i podmladak | [`src/lib/questions.ts`](src/lib/questions.ts), niz `OMLADINA` | `a`, `b`, `c`, `d`, `e` |
| Petlići | [`src/lib/questions-petlici.ts`](src/lib/questions-petlici.ts), niz `PETLICI` | `p` |

Dodaj objekat na kraj odgovarajućeg niza:

```ts
{
  id: "p43",                    // NOV, jedinstven u OBE baze
  topic: "istorijat",           // petlići: humanost | istorijat | krv | osnove
                                // omladina: pristup | pregled | kpr | disajni |
                                //           krvarenje | povrede | stanja | trovanja
  text: "Tekst pitanja?",
  options: ["Prvi", "Drugi", "Treći"],   // može i 4 ili 5 ponuđenih
  correct: 2,                   // index tačnog: 0, 1, 2…
  group: "neka-grupa",          // opciono — vidi dole
  note: "Objašnjenje...",       // opciono — prikazuje se POSLE odgovora
},
```

Za pitanje sa narandžastom ADR tablicom (transport opasnih materija) dodaj i:

```ts
  plate: { top: "30", bottom: "1202" },
```

**Važno o `group`:** ako novo pitanje već postoji u drugoj formulaciji (isto gradivo,
drugačiji ponuđeni odgovori), daj obama isti `group`. Kviz tada nikada neće staviti
oba u istu rundu. U omladinskoj bazi trenutno ima 20 takvih grupa.

**Nikad ne menjaj postojeći `id`** — na njega je vezana istorija u bazi.

Posle dodavanja pokreni `npm run proveri`.

---

## Napomene uz baze pitanja

### Omladina — sporna pitanja (rešeno)

Skenirane verzije testa bile su na pet mesta protivrečne. Tačni odgovori su potvrđeni:

| ID | Tačan odgovor |
|---|---|
| `a02` | Ukloni upotrebljeni otpadni materijal |
| `d14` | Odsustvo svesti i disanja |
| `d15` | 30:2 |
| `d19` | Gornji desni ugao grudnog koša ispod ključne kosti i pored leve bradavice, s bočne strane |
| `d38b` | Polusedeći sa savijenim nogama |

### Petlići — prilagođena pitanja

U originalnom dokumentu neka pitanja nisu bila sa ponuđenim odgovorima, pa su
prilagođena formatu kviza. **Tačan odgovor je iz dokumenta, netačni su dodati:**

| ID | Šta je bilo u originalu |
|---|---|
| `p06` | dopunjavanje („Anri Dinan") |
| `p34` | zaokruživanje više predmeta iz kutije prve pomoći |
| `p39`–`p42` | jedna rečenica sa prazninama za dopunu |

**Nije preneto:** zadatak spajanja znakova sa brojevima (strana 68) — traži slike
znakova kojih nema u dokumentu.

---

## Kako radi bodovanje

| Režim | Omladina | Petlići | Osnovni bodovi | Posebno |
|---|---|---|---|---|
| 📋 Klasično | 45s | bez isteka | 100 | — |
| ⚡ Brzi metak | 20s | — | 150 | — |
| ✂️ Pola-pola | 30s | bez isteka | 140 | posle 12s (petlići 25s) nestaje jedan netačan |
| 🎲 Duplo ili ništa | 30s | — | 100 | tačno = ×2, netačno = −100 |
| 🔥 Munja | 15s | — | 200 | poslednja pitanja u rundi |

Na to ide **bonus za brzinu** (do +50% osnovnih bodova) i **množilac za niz**
tačnih odgovora: 3+ → ×1.2, 5+ → ×1.5, 8+ → ×2.

Bodove računa **server**, iz potpisane runde — poslati rezultat se ne uzima na veru.

---

## Struktura

```
src/
  app/
    page.tsx              izbor kviza + unos imena
    kviz/page.tsx         tok kviza
    admin/page.tsx        istorija i statistika
    api/
      round/              sastavlja rundu i potpisuje je
      result/             ponovo boduje i upisuje
      admin/              prijava, statistika, CSV
  components/
    QuestionCard.tsx      kartica pitanja
    TimerRing.tsx         prsten tajmera (mirni režim za petliće)
    ResultScreen.tsx      ekran rezultata
    GroupReport.tsx       zajednički izveštaj označene grupe
    adminUi.tsx           sitni delovi admin panela
  lib:
    questions.ts          baza za omladinu + spajanje obe baze
    questions-petlici.ts  baza za petliće
    quiz.ts               pravila programa, mešanje, režimi, bodovanje
    stats.ts              statistika + detaljna analiza po takmičaru
    db.ts                 Postgres (Vercel) ili lokalni fajl
    token.ts              potpisivanje runde i admin sesije
```

---

Ovo je pomoćno sredstvo za učenje, a ne zamena za obuku Crvenog krsta.
