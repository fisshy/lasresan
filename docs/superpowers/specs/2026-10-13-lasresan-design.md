# Läsresan 2.0 – design

Datum: 2026-10-13. Status: utkast skrivet autonomt utifrån Joachims uppdrag
("kolla igenom all forskning, ta fram bästa app, GitHub Pages, roligare design").

## 1. Syfte och målgrupp

Läsresan är en fristående webbapp (GitHub Pages, ingen backend) för daglig,
vuxenledd avkodningsträning för barn i ungefär årskurs 1–3 som behöver extra
stöd. Appen är ett verktyg för paret *vuxen + barn*, inte ett självspelande
spel: forskningen är entydig om att effekten kommer av explicit undervisning,
omedelbar återkoppling och hög dos, inte av appen i sig.

Antaganden (ej bekräftade av Joachim):
- Primär användning hemma, en vuxen och ett barn, på surfplatta eller mobil.
- Svenska. Ingen inloggning. Data lagras lokalt i webbläsaren.
- Befintlig v1-data (localStorage `lasresan-site-v1`) migreras om den finns.

## 2. Forskningsgrund → designprinciper

Källor: Hall et al. 2023 (metaanalys, 53 studier, g = 0,33), Levlin & Nakeva
von Mentzer 2020 (svensk åk 2-studie), Schuele & Boudreau 2008, Castles,
Rastle & Nation 2018, Share 1995, Lee & Yoon 2017, Svensson et al. 2021,
Hulme/Snowling 2015, SBU 2014 – samtliga via Anna Eva Hallins sammanfattningar
på sprakforskning.se.

| Fynd | Konsekvens i appen |
|---|---|
| Systematisk syntetisk phonics är kärnan; CVC före CCV; långa vokaler före korta; högfrekventa ljud först | Nivåstege: ljud → korta ord → konsonantförbindelser → tvåstaviga → sammansatta → svåra ljud (ng/sj/tj/k) → texter |
| Stavning i träningen höjer effekten (g 0,37 mot 0,23) | Varje pass har ett stavningsblock (lyssna → bygg ordet med bokstavsbrickor) |
| Fonemisk medvetenhet kopplad till bokstäver; "teach, don't test"; stödtrappa modell → stöd → själv | Ljudlek-block med syntes/segmentering/byt-ljud, alltid med bokstäver synliga, tre stödnivåer |
| Dos är signifikant (0,002/timme); Levlin: 30 min/dag, 5 dagar, 6 veckor | Dagens pass ~20 min med timer; appen räknar ackumulerad tid och visar veckomål |
| Läsning av sammanhängande text i 87 % av studierna; upprepad läsning ger flyt | Meningar/korta texter per nivå, läses 2–3 ggr, flyt skattas av vuxen |
| Avkodat ord ska kopplas till betydelse (självlärandehypotesen) | Varje ord har en bild (emoji) och en kort förståelsefråga i texterna |
| Vuxen återkoppling avgör; korrekthet före hastighet | Vuxen registrerar *själv / med hjälp / inte än* per ord; inga poäng för fart |
| RTI: följ varje elevs respons | Vuxenpanel: per-ord-historik, ord att repetera återkommer först i nästa pass, trend, CSV-export |
| Nonsensord motverkar gissning men är meningslösa i mängd | "Trollord" som valfritt litet inslag (max 3 per pass), aldrig som huvudinnehåll |
| Talsyntes ger se+höra samtidigt | Web Speech API (sv-SE) för att läsa ord/mening; av/på i inställningar; aldrig ett krav |
| Motivation stödjer men ersätter inte undervisning | Resekarta, stjärnor, konfetti, maskot – belönar genomförda pass, inte hastighet |

## 3. Arkitektur

Statisk sajt utan byggsteg (GitHub Pages serverar `main` root). Vanliga
`<script src>` i beroendeordning, inga ES-moduler: Chrome blockerar moduler
från `file://`, och appen ska gå att öppna direkt från disk.

```
index.html          skal + vyer
css/style.css       tema, komponenter, animationer
js/data.js          nivåer, ordlistor, texter (ren data)
js/store.js         localStorage, migrering, statistik, repetitionsurval (ren logik, testbar)
js/speech.js        talsyntes-wrapper
js/app.js           state machine + rendering
test/*.test.mjs     node --test: datakonsistens + store-logik
```

Vyer: **Hem/karta** (välj nivå, starta Dagens pass) → **Pass** (block i följd:
Repetera → Ljudlek → Ord → Text → Stava → Klart) → **Vuxenpanel**
(statistik, inställningar, export, radera). Fri övning: varje block kan också
startas enskilt från kartan.

## 4. Datamodell (localStorage `lasresan-v2`)

```
{ name, settings:{tts,timer,trollord},
  levelIndex,
  attempts:[{ts, level, word, result:'self'|'help'|'no', mode}],
  spelling:[{ts, level, word, ok}],
  sessions:[{ts, level, minutes, blocks:[...]}],
  minutesTotal }
```

Repetitionsurval: senaste resultat per ord; ord med `help`/`no` prioriteras
(max 6) i Repetera-blocket. Ord som lästs `self` två gånger i rad lämnar kön.

## 5. Design

Lekfullt men lugnt: krämvit bakgrund, varma accentfärger (korall, solgul,
himmelsblå, mint), rundad display-font (Fredoka från Google Fonts, fallback
system-ui), stora knappar (min 56 px), maskot-räv med pratbubbla, resekarta
med stationer per nivå, konfetti vid avslutat pass. Vuxenpanelen är
nedtonad och saklig. Mobil först, fungerar i print för ordlistor.

## 6. Testning

- `node --test` på data (alla ord har delar/bild, inga dubbletter, texter
  använder bara ord ur nivån eller högfrekventa småord) och store-logik
  (repetitionsurval, statistik, migrering).
- Manuell körning i Chrome och skärmdump av huvudvyerna.

## 7. Utanför scope

Inloggning/moln-synk, flera profiler, egna ordlistor (kan bli v2.1),
inspelning av barnets röst, automatisk rättning av läsning.
