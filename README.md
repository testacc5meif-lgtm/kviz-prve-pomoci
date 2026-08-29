# Kviz prve pomoći — Crveni krst Mionica

Interaktivni trening kviz za takmičare i volontere u pružanju prve pomoći.

- **90 pitanja** u bazi, **25 nasumičnih po rundi**
- **Ponuđeni odgovori se mešaju** svaki put — deca ne mogu da pamte „drugi odgovor je tačan"
- **5 režima igre** (klasično, brzi metak 10s, pola-pola, duplo ili ništa, munja 8s)
- **Praćenje napretka po igraču** — sledeća runda donosi pitanja koja još nisu savladana
- **Popravni krug** — na kraju runde možeš odmah ponoviti samo ono što nisi znao
- **Admin panel** sa istorijom svih rezultata, filtriranjem po danu i detaljnom
  analizom za takmičare koje sam označiš (lozinka)

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

Proverava bazu pitanja (duplikati, indeksi tačnih odgovora, prazne opcije).
**Pokreni ovo svaki put kad dodaš nova pitanja.**

```bash
node scripts/test-api.mjs
```

Prolazi kroz ceo lanac — rundu, bodovanje, upis i admin. Zahteva pokrenut `npm run dev`.

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

Šta se vidi:

- **Pregled** — broj takmičara, rundi, prosečan rezultat, rang lista
- **⭐ Moja grupa** — označiš koga pratiš (npr. onih 6 takmičara) i za svakog dobijaš:
  **svako pitanje koje je promašio, šta je izabrao i koji je tačan odgovor**,
  koliko puta je isto pitanje promašio, da li ga i dalje ne zna, razradu po
  oblastima i spisak svih njegovih rundi. Izbor se pamti na tvom računaru.
- **Svi takmičari** — tabela sa čekiranjem za praćenje; broj rundi, najbolji i
  prosečan rezultat, tačnost, savladano od 90, najduži niz, prosečno vreme
- **Sve runde** — svaka odigrana runda pojedinačno
- **Pitanja** — sortirano od najtežih ka najlakšim, sa procentom tačnosti po pitanju
- **Analiza** — uspeh po oblastima, po režimima igre, aktivnost po danima
  (klik na stubić prikazuje samo taj dan)
- **CSV izvoz** — svaki pojedinačni odgovor sa tekstom izabranog odgovora; poštuje
  izabrani period i označene takmičare

### Filter po periodu

Gore stoji traka **Period**: `Sve vreme` / `Danas` / `7 dana` / `30 dana`, plus polja
**Od** i **Do** za bilo koji raspon. Dani se računaju po lokalnom vremenu.

---

## Dodavanje novih pitanja

Sva pitanja su u [`src/lib/questions.ts`](src/lib/questions.ts). Dodaj na kraj niza:

```ts
{
  id: "e01",                    // NOV, jedinstven — nikad ne menjaj postojeće
  topic: "krvarenje",           // pristup | pregled | kpr | disajni |
                                // krvarenje | povrede | stanja | trovanja
  text: "Tekst pitanja?",
  options: ["Prvi", "Drugi", "Treći"],
  correct: 2,                   // index tačnog: 0, 1 ili 2
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
oba u istu rundu. U bazi trenutno ima 20 takvih grupa.

**Nikad ne menjaj postojeći `id`** — na njega je vezana istorija u bazi.

Posle dodavanja pokreni `npm run proveri`.

---

## Sporna pitanja — rešeno

Skenirane verzije testa su na pet mesta bile protivrečne ili nejasno označene.
Tačni odgovori su potvrđeni i napomene su uklonjene:

| ID | Tačan odgovor |
|---|---|
| `a02` | Ukloni upotrebljeni otpadni materijal |
| `d14` | Odsustvo svesti i disanja |
| `d15` | 30:2 |
| `d19` | Gornji desni ugao grudnog koša ispod ključne kosti i pored leve bradavice, s bočne strane |
| `d38b` | Polusedeći sa savijenim nogama |

U bazi je ostalo 7 napomena, ali su sve **objašnjenja gradiva** (npr. šta znači RICE,
kako se računa pravilo devetke) — prikazuju se takmičaru posle odgovora kao pomoć u učenju.

## Kako radi bodovanje

| Režim | Vreme | Osnovni bodovi | Posebno |
|---|---|---|---|
| 📋 Klasično | 45s | 100 | — |
| ⚡ Brzi metak | 20s | 150 | — |
| ✂️ Pola-pola | 30s | 140 | posle 12s nestaje jedan netačan, bodovi se prepolove |
| 🎲 Duplo ili ništa | 30s | 100 | tačno = ×2, netačno = −100 |
| 🔥 Munja | 15s | 200 | poslednja pitanja u rundi |

Vremena su namerno produžena — na 10 sekundi se duže pitanje sa tri ponuđena
odgovora nije stizalo ni pročitati.

Na to ide **bonus za brzinu** (do +50% osnovnih bodova) i **množilac za niz**
tačnih odgovora: 3+ → ×1.2, 5+ → ×1.5, 8+ → ×2.

Bodove računa **server**, iz potpisane runde — poslati rezultat se ne uzima na veru.

---

## Struktura

```
src/
  app/
    page.tsx              početna + unos imena
    kviz/page.tsx         tok kviza
    admin/page.tsx        istorija i statistika
    api/
      round/              sastavlja rundu i potpisuje je
      result/             ponovo boduje i upisuje
      admin/              prijava, statistika, CSV
  components/
    QuestionCard.tsx      kartica pitanja
    TimerRing.tsx         prsten tajmera
    ResultScreen.tsx      ekran rezultata
  lib/
    questions.ts          BAZA PITANJA
    stats.ts              statistika + detaljna analiza po takmičaru
    quiz.ts               biranje pitanja, mešanje, režimi, bodovanje
    db.ts                 Postgres (Vercel) ili lokalni fajl
    token.ts              potpisivanje runde i admin sesije
```

---

Ovo je pomoćno sredstvo za učenje, a ne zamena za obuku Crvenog krsta.
