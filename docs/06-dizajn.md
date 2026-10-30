# Dizajn FBK Loka

Povzetek odločitev za videz strani. Podrobnosti in razlogi so v `SPEC.md` §9, tokeni v `src/styles/global.css`.
Zapisano 30. 10. 2026 ob auditu z `web-dizajn-sistem` (verzija 29. 10. 2026).

## Smer

Ena smer, izbrana v SPEC §9.1: **črna in rumena kluba, mirna bela vsebina, en drzen element**
(tekmovalna tabla na naslovnici).

Pridevniki (izpeljani iz SPEC §9.1, potrdi): športno (ne agresivno), mirno in urejeno (ne dolgočasno),
lokalno (ne generično), zanesljivo (ne korporativno).

Kdo gleda: starš na telefonu zvečer (urnik, vpis), navijač pred tekmo (naslednja tekma), sponzor (doseg).

Fiksni elementi znamke: klubski logotip (vektor iz PDF kluba, 30. 10. 2026), rumena `#fff112` iz logotipa, črna.

## Test proti generičnemu videzu

- Vzorec 2 (skoraj črna + en živ poudarek): razlog iz briefa je klubski logotip in dresi (črna, rumena).
  Prepoznavnost nosijo še vzorec lukenj žogice na tabli, prave fotografije s Podna in široka Archivo.
- Vzorec 3 (enake kartice povsod): ne. Kartice samo za novice, trenerje in treninge.
- Vzorec 5 (pojavljanje ob pomikanju): ne.
- Vzorec 4 (`→` na povezavah): samo pri povezavah, ki vodijo naprej ("Vse tekme", "Vse novice", "Vsa zgodovina",
  "Kdaj in kje so treningi", "Vpišite otroka") in na kartici ekipe. Razlog: puščica pove "pojdi naprej", ni okras.
  Pravilo v SPEC §9.7 (Maj, 30. 10. 2026).
- Vzorec 6 (obarvana beseda v naslovu): ena sama, "Prvi treningi so **brezplačni**" na /vpis. Razlog: glavno
  sporočilo strani za starše. Izjema v SPEC §9.7 (Maj, 30. 10. 2026); drugje ne.

## Tokeni (izvleček)

| Vloga | Token | Vrednost |
|---|---|---|
| Glava, noga, tabla, besedilo | `--color-ink` | `#0b0b0c` |
| Poudarek (nikoli besedilo na svetlem) | `--color-ball` | `#fff112` |
| Podlaga | `--color-paper` / `--color-court` | `#ffffff` / `#f4f4f2` |
| Drugotno besedilo | `--color-muted` | `#5c5c5c` |
| Robovi polj | `--color-input-border` | `#767676` |
| Napake | `--color-error` | `#b42318` |
| Pisava | `--font-sans` | Archivo Variable (latin + latin-ext), ena družina |
| Širina strani / besedila | `--container-page` / `--container-text` | `75rem` / `60ch` (`max-w-text`, od 30. 10.) |
| Zaobljenost | `--radius-card` / `--radius-field` | `1rem` / `0.75rem` |

Kontrast: `npm run check:contrast` preveri vse pare (zadnjič 30. 10. 2026: vsi OK).
Fokus: obroč 2 px z odmikom 2 px, črn na svetli in rumen na temni podlagi (`--focus-ring`).

## Gibanje

Pravila v SPEC §9.6: samo kjer potrdi dejanje, največ 250 ms za UI, `prefers-reduced-motion` izklopi premike.

| Element | Gibanje |
|---|---|
| Fotografije za tablo na naslovnici | Prelivanje prosojnosti 1,2 s vsakih 6 s, gumb za ustavitev, brez z "reduce motion" (odločitev kluba 28. 9.) |
| Trak sponzorjev | Brez gibanja od 30. 10. 2026 (prej neskončna zanka) |
| Mobilni meni, gumbi, povezave, kartice novic | `--ease-out`, `--dur-*` tokeni |

## Komponente s stanji

`Button` (hover, active `scale(0.97)`, focus-visible), `Field` in `NetlifyForm` (napaka z besedilom, oddaja),
mobilni meni (`<dialog>`, Escape, fokus se vrne), `Tabs`, `TeamFilter`, `ArrowLink`, `Gallery` (mirna mreža).

## Odprto

- Točne barve kluba (rumena je vzeta z logotipa) in avtor znaka: `docs/04-odprto-pri-klubu.md`.
