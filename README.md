# 🦊 Läsresan

Daglig, forskningsbaserad avkodningsträning för barn (ungefär årskurs 1–3) som behöver extra stöd. Appen är ett verktyg för paret **vuxen + barn**: forskningen är tydlig med att effekten kommer av explicit undervisning, omedelbar återkoppling och hög dos, inte av appen i sig.

Statisk webbapp utan byggsteg. Körs direkt från GitHub Pages. All data sparas lokalt i webbläsaren.

## Så fungerar ett pass (~20 min)

| Block | Minuter | Vad | Varför |
|---|---|---|---|
| 🔁 Repetera | 3 | Ord som behövde hjälp förra gången | Ord som missats återkommer tills de lästs rätt två gånger |
| 👂 Ljudlek | 3 | Syntes, segmentering, ljudbyte, stavelser, kluriga ljud | Fonemisk medvetenhet, alltid kopplad till bokstäver |
| 📖 Läs ord | 6 | 8 nya ord på rätt nivå, vuxen markerar *själv / med hjälp / inte än* | Systematisk phonics, korrekt före snabbt |
| 📜 Läs text | 5 | 3 meningar + en kort berättelse läst två gånger, flytskattning, förståelsefråga | Upprepad läsning ger flyt, ordet kopplas till betydelse |
| ✏️ Stava | 4 | Lyssna på ordet, bygg det med bokstavsbrickor | Stavning i träningen höjer effekten markant |

Sju nivåer: korta ord med långa vokaler → korta vokaler/dubbelteckning → konsonantförbindelser → två stavelser → sammansatta ord → kluriga ljud (ng, sj, tj, hj…) → berättelser och snabbord. Nivån byts när 80 % av orden lästs rätt själv.

Vuxenpanelen visar dos (minuter per vecka mot målet 100), per-nivå-statistik, ord att öva extra, läsflyt över tid, CSV-export och inställningar (talsyntes, ljud, trollord).

## Forskningsgrund

Designen bygger på Anna Eva Hallins sammanfattningar på [sprakforskning.se](https://www.sprakforskning.se/forskningsbloggen2/2023/10/5/40arsforskning), i synnerhet:

- **Hall m.fl. (2023)**, metaanalys av 53 studier (6 053 elever): systematisk avkodningsträning har effekt, g = 0,33. Två faktorer var signifikanta: **stavningsträning** (g 0,37 mot 0,23 utan) och **dos**.
- **Levlin & Nakeva von Mentzer (2020)**, svensk åk 2-studie: 30 min/dag i 6 veckor, 69 % nådde jämnårig ljudande läsning.
- **Schuele & Boudreau (2008)**: fonemisk medvetenhet tränas med bokstäver; *teach, don't test*; stödtrappa modell → stöd → själv.
- **Castles, Rastle & Nation (2018)**, **Share (1995)**: ordbilder lagras när ordet ljudas rätt och kopplas till betydelse.
- **Lee & Yoon (2017)**: upprepad läsning av text på rätt nivå ger flyt.
- **Hallin (2024)** om läslistor: aldrig listor utan individuell återkoppling, nonsensord sparsamt.
- **Svensson m.fl. (2021)**: talsyntes ger se + höra samtidigt men ersätter inte avkodningsträning.

Fullständig designspec: `docs/superpowers/specs/2026-10-13-lasresan-design.md`.

## Köra lokalt

Dubbelklicka på `index.html`. Appen använder vanliga `<script src>` (inga ES-moduler), så den fungerar direkt från disk via `file://` såväl som på GitHub Pages. Testerna i `test/static.test.mjs` vaktar att det förblir så.

## Tester

```
node --test "test/*.test.mjs"
```

Testerna kontrollerar datakonsistens (ordens delar, bilder, texter, frågor) och logiken för repetitionsurval, ordval, stavningsrättning, statistik och migrering från v1.

## Deploy

GitHub Pages från `main`, root. `.nojekyll` ligger med så att inga filer filtreras bort.

## Struktur

```
index.html        skal
css/style.css     tema och komponenter
js/data.js        nivåer, ord, meningar, texter (ren data)
js/store.js       lagring, urval, statistik (ren logik, testad)
js/speech.js      talsyntes och ljud
js/app.js         vyer och händelser
test/             node --test
```
