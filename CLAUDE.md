# FBK Loka — spletna stran

Stack: Astro (zadnja stabilna), Tailwind 4, TypeScript strict, Netlify, Decap (faza 2).
Ukazi: `npm run dev` | `npm test` | `npm run verify` | `npm run test:a11y`
Specifikacija: `SPEC.md` (kaj gradiš). Namen in merila: `docs/01-brief.md` (zakaj).

Struktura: `src/components/{ui,sections}`, `src/content`, `src/data/ff` (generirano, ne urejaj ročno),
`src/config`, `src/layouts`, `src/pages`, `src/styles/global.css` (tokeni), `scripts/`, `tests/`, `apps-script/ekipa/`.

## Pravila

- Gradi po fazah iz SPEC.md, poglavje 15. Po vsakem koraku se ustavi.
- Pred kodo, ki uporablja Astro API (collections, slike, Markdown, config, CSP), preveri trenutno verzijo prek astro-docs MCP.
- Barve, razmiki, tipografija samo prek tokenov v `global.css`. Brez surovih hex vrednosti in `text-[#...]` v komponentah.
- Rumena (`ball`) nikoli kot besedilo na beli ali svetli podlagi.
- Brez nove knjižnice brez utemeljitve. Najprej semantični HTML in majhen `<script>`.
- Brez React, Vue, `client:*` otokov in `is:inline` skript.
- Sekcija brez vsebine se ne izriše.
- Slike: `astro:assets` `<Image>`/`<Picture>` iz `src/`, obvezne dimenzije in `alt`. Hero ni lazy.
- Vsaka interaktivna komponenta: `focus-visible`, onemogočeno, nalaganje in napaka stanje, deluje s tipkovnico.
- Mladoletnim se nikoli ne prikaže letnik, šola ali kontakt.
- Najmanjša sprememba. Pokaži celotno spremenjeno datoteko s komentarji.
- Predpostavke izpiši. Ko ni jasno, vprašaj.

## Narejeno za vsak korak

`npm run verify` zeleno, deluje pri 360 px in desktopu, tipkovnica deluje, predlagano commit sporočilo.

Na koncu koraka izpiši:

```text
Spremenjene datoteke:
Odločitve:
Predpostavke:
Zagnani testi:
Kaj testiraj ti:
Odprto pri klubu:
```
