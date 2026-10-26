# FBK Loka – spletna stran

Spletna stran floorball kluba FBK Loka iz Škofje Loke: **https://fbkloka.netlify.app** (po selitvi domene fbkloka.si).

Tekme, rezultati, lestvice in MVP vikenda prihajajo sami s FloorballFlash. Novice, treninge, sponzorje, trenerje in
igralce klub ureja v urejevalniku na `/admin`, brez programiranja.

**Kaj gradimo:** [`SPEC.md`](SPEC.md). **Zakaj in za koga:** [`docs/01-brief.md`](docs/01-brief.md).
**Odprto pri klubu:** [`docs/04-odprto-pri-klubu.md`](docs/04-odprto-pri-klubu.md).

## Tehnologija

Astro 7, Tailwind 4, TypeScript (strict), Netlify, Decap CMS s prijavo prek DecapBridge. Skoraj brez JavaScripta v
brskalniku: majhni skripti samo za filtre, menjavo slik, skrite strani ekipe in obrazce.

## Ukazi

| Ukaz | Kaj naredi |
|---|---|
| `npm ci` | Namesti odvisnosti (Node iz `.nvmrc`) |
| `npm run dev` | Razvojni strežnik |
| `npm test` | Enotni testi (`tests/*.test.ts`) |
| `npm run verify` | Preverbe tipov, testi, kontrast, build, HTML, povezave, SEO. **To je build ukaz na Netlify**: napaka ustavi deploy |
| `npm run test:a11y` | Brskalniški testi s Playwright in axe (lokalno, z nameščenim Edge) |
| `npm run fetch:ff` | Prenese tekme, lestvice, sestave in MVP s FloorballFlash v `src/data/ff/` (ne urejaj ročno) |
| `npm run week:publish` | Napiše povzetek tedna v `src/content/novice/` (`WEEK_END=2026-10-25` za pretekli teden) |
| `npm run scan:ff` | Poišče tekmovanja tekoče sezone z ekipami FBK Loka (ob začetku sezone) |

## Kako se stran posodablja

- **Podatki s FloorballFlash:** GitHub Action [`fetch-ff.yml`](.github/workflows/fetch-ff.yml) teče v noči z nedelje
  na ponedeljek (22:00–06:00 po ljubljanskem času, več poskusov, ker GitHub zagone zamika). Zagon prenese podatke,
  napiše povzetek tedna in commita samo ob spremembi; ko je bot tisto noč objavil, ostali zagoni nič ne naredijo. Tekmovanja so v
  [`src/config/ff.ts`](src/config/ff.ts). Ko se na FloorballFlash pojavi novo tekmovanje z ekipo Loka, zagon pade in
  GitHub pošlje e-pošto.
- **Urejevalnik `/admin`:** shranjuje na vejo `vsebina`. Nedeljski zagon jo združi v `main` skupaj s podatki, zato je en
  deploy na teden. Nujna objava med tednom: GitHub → Actions → fetch-floorballflash → Run workflow.
- **Skriti strani ekipe** `/ekipa/plato/` in `/ekipa/prevoz/`: Google Sheet in Apps Script, navodila v
  [`apps-script/ekipa/README.md`](apps-script/ekipa/README.md).

## Veje in Netlify

| Veja | Namen |
|---|---|
| `main` | Produkcija. Vsak uspešen deploy stane 15 od 300 kreditov na obdobje (Netlify Free, trda meja) |
| `razvoj` | Razvoj. Brezplačen predogled na `razvoj--fbkloka.netlify.app` (vidi ga le, kdor je prijavljen v Netlify) |
| `vsebina` | Shranjevanje iz urejevalnika. Netlify je ne gradi |

V `main` gre `razvoj` po dogovoru, največ enkrat na teden, med tednom. Commiti, ki spremenijo samo dokumentacijo,
ne sprožijo gradnje ([`scripts/netlify-ignore.sh`](scripts/netlify-ignore.sh)). Proračun kreditov: SPEC.md §20.6.

## Struktura

```text
src/
  components/      komponente (ui/ osnovni gradniki, ekipa/ skriti strani, forms/ obrazci)
  content/         vsebina v Markdown in YAML: novice, treningi, sponzorji, trenerji, igralci, selekcije, strani …
  data/ff/         podatki s FloorballFlash (generirano)
  config/          nastavitve: tekmovanja (ff.ts), MVP, CSP, skrite strani
  layouts/  pages/ lib/
  styles/global.css  barve, razmiki in pisave (tokeni)
public/admin/      urejevalnik Decap (index.html, config.yml)
scripts/           prenos podatkov, povzetek tedna, preverbe
tests/             enotni testi; tests/e2e/ brskalniški testi
apps-script/ekipa/ zaledje skritih strani ekipe
docs/              brif, odprta vprašanja za klub, znamka
```

## Pravila

Pravila za razvoj (tokeni, dostopnost, mladoletni, brez novih knjižnic brez razloga) so v [`CLAUDE.md`](CLAUDE.md) in
SPEC.md. Mladoletnim se na strani nikoli ne prikaže letnik, šola ali kontakt. Repozitorij je javen: vanj ne gredo
osebni podatki, ki niso za objavo.
