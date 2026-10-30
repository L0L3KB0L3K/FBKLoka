# Blagovna znamka FBK Loka: inventar

Stanje: 28. 9. 2026. Popis tega, kar klub že ima. Brez prenove znaka.
[MANJKA] = podatka nimamo. [PREVERI] = podatek imamo, ni pa potrjen.

## Povzetek

- Znak je dober in prepoznaven: palica kot »l«, žogica kot »o«. Prenove ne potrebuje.
- Največja vrzel: klub ni imel vektorske datoteke logotipa. Zdaj je v `src/assets/logo/`, klub jo mora potrditi.
- Ime ni povsod enako: Facebook in YouTube še nosita ime Insport, stara stran uporablja drugo rumeno.
- Manjkajo prave fotografije v dresih FBK Loka, podatek o pisavi napisa in barve za tisk.

## 1. Ime

| Kje | Zapis |
|---|---|
| Poslovni register | FLOORBALL KLUB LOKA [PREVERI] |
| Nova stran, Instagram, FloorballFlash | FBK Loka |
| Logotip | »loka« in napis »FLOORBALL KLUB« |
| Stara stran | »Floorball klub FBK Loka« in »Floorball klub Loka« |
| Prejšnje ime | FBK Insport Škofja Loka; še prej Loka Spiders (FBK ali FBC [PREVERI]) |

## 2. Logotip

Sestava: palica za floorball kot »l«, rumena žogica z luknjami kot »o«, črki »k« in »a« samo v obrisu,
spodaj črta in rumen napis »FLOORBALL KLUB«. Notranjost črk in luknje žogice so prosojne: na svetli
podlagi so obrisi črni, na temni beli.

| Datoteka | Oblika | Stanje |
|---|---|---|
| Klubski PDF »LOGO - FBK Loka - (končni).pdf« | Vektor (poti, pisave v krivuljah), tri različice: svetla, temna, enobarvna vijolična | Od 30. 10. 2026 vir za `src/assets/logo/logo-na-temnem.svg` in `docs/znamka/logo-na-svetlem.svg`, `logo-stampiljka.svg` |
| `docs/znamka/logo-dark.png` | PNG 1772×790, črna podlaga, brez prosojnosti | Arhiv (do 28. 9. 2026 v glavi) |
| `docs/znamka/logo-light.png` | PNG 1772×790, bela podlaga, brez prosojnosti | Arhiv, vir prerisanega vektorja |
| FloorballFlash »LOGO - FBK Loka - (končni).svg« | JPEG 1812×828 v ovoju SVG. Ni vektor. Podatki v datoteki: ACDSee, 20. 10. 2024, Gorazd Tomc | Na FloorballFlash |
| `src/assets/logo/logo-na-temnem.svg` | Klubski vektor (30. 10. 2026) | Glava strani, slika za deljenje (`public/og.png`), naslovnica povzetka tedna (`scripts/summary-cover.ts`, ob novem logotipu jo zaženi znova) |

Klubski PDF so poslali kot `.pdf` in `.cdr`; SVG je iz PDF-ja, samo poti, brez rastra in pisav. Avtor znaka: [MANJKA].
V temni različici so notranjosti črk črne (tako je v PDF-ju): na črni podlagi se ne vidijo.

### Vektorske datoteke

Na strani je samo, kar stran uporablja (`src/assets/logo/`). Ostale različice so v `docs/znamka/`.

| Datoteka | Za kaj |
|---|---|
| `docs/znamka/logo-na-svetlem.svg` | Bela in svetla podlaga, dokumenti (klubski vektor) |
| `src/assets/logo/logo-na-temnem.svg` | Črna in temna podlaga, glava strani (klubski vektor) |
| `docs/znamka/logo-stampiljka.svg` | Enobarvni vijolični, žig (klubski vektor) |
| `docs/znamka/logo-na-*-brez-napisa.svg` | Majhne velikosti (pod okoli 200 px širine), kjer napis ni berljiv. Prerisano (28. 9.), izpeljava, ne izvirnik |
| `docs/znamka/logo-enobarvni-crn.svg`, `logo-enobarvni-bel.svg` | Tisk v eni barvi, vezenje (prerisano, 28. 9.) |
| `src/assets/logo/zogica.svg`, `docs/znamka/zogica-crna.svg`, `zogica-bela.svg` | Favicon, profilna slika, 16–64 px (prerisano, 28. 9.) |

Pregled vseh različic: `docs/znamka/pregled.png`.

Kako so nastale prerisane različice (28. 9. 2026): brez AI generatorja slik. Obrisi, palica, črta in napis so sledeni (potrace) iz
`logo-light.png` pri 2- in 4-kratni povečavi. Žogica je zgrajena na novo: en krog in 11 elips,
izmerjenih iz slike. Primerjava z izvirnikom: razlika 1,7 % pikslov, vsa na robovih. Preverjeno pri
16, 24, 32, 128 in 1024 px, na svetli in temni podlagi. V datotekah ni rastra, skript ne pisav.

Omejitve:
- Napis »FLOORBALL KLUB« ima pri močni povečavi drobne stopnice na krivinah, ker je v izvoru visok le okoli 35 px.
  Za velik tisk (transparent, dres) potrebujemo izvorno pisavo ali datoteko.
- Celoten logotip pod 64 px ni berljiv (tudi izvirnik ne). Tam se uporabi žogica.
- Podobnost z drugimi znamkami in registracija znamke nista preverjeni [MANJKA].

## 3. Barve

| Barva | Vrednost | Vir | Opomba |
|---|---|---|---|
| Rumena (žogica, napis) | `#fff200`, RGB 255 242 0 | Klubski vektor (PDF, 30. 10. 2026); prej `#fff112`, izmerjeno s PNG | [MANJKA] CMYK ali Pantone za tisk |
| Črna | `#000000` | Logotip | |
| Bela | `#ffffff` | Logotip | |
| Rumena stare strani | `#FFD60A` | fbkloka.si | Se ne ujema z logotipom, ne uporabljati |

Rumena na beli ima kontrast le 1,2 : 1, zato ni primerna za besedilo. Na črni ima 18 : 1.
Dresi: na fotografijah 2025/26 rumeni s črnim; starejši beli dresi Insport. [MANJKA] uradne barve dresov in rezervni dres.

## 4. Pisave

| Kje | Pisava | Licenca |
|---|---|---|
| Logotip »loka« | Narisane črke, ni pisava | – |
| Napis »FLOORBALL KLUB« | Debela razširjena groteska [MANJKA] ime | [MANJKA] |
| Nova spletna stran | Archivo (naslovi razširjeni) | OFL-1.1, brezplačno tudi za tisk |
| Stara stran | Bebas Neue, Inter | OFL |

## 5. Grafični elementi

- Vzorec lukenj žogice (iz logotipa): na tabli z naslednjo tekmo na naslovnici.
- Črta pod naslovi: na spletni strani.
- Maskote in grba ni. Geslo s stare strani »Skupaj rastemo. Skupaj zmagujemo.« [PREVERI], ali je uradno.

## 6. Fotografije

- 4 fotografije s finala državnega prvenstva 22. 3. 2026, 2400 px, v dresih FBK Loka (dovoljenje 26. 10. 2026): tri na naslovnici, postava na /klub. Fotografije s stare strani v dresih Insport so odstranjene. [MANJKA] ali navedemo avtorja.
- 11 slik iz objav na Instagramu (novice), 720–1600 px, kvadratne ali pokončne.
- Manjka (SPEC 9.1a): skupinska v dresih FBK Loka, akcija s tekme, portreti trenerjev, otroci na treningu
  (s privolitvijo), dvorana od zunaj.

## 7. Digitalni profili

| Kanal | Naslov | Opomba |
|---|---|---|
| Domena | fbkloka.si | [MANJKA] kdo jo ima; zdaj še stara stran z izmišljenimi igralci |
| E-pošta | info@fbkloka.si, lokafloorball@gmail.com | Gmail prejema sporočila z obrazca |
| Instagram | @fbk_loka | |
| TikTok | @fbk.loka | Drugačen zapis kot na Instagramu |
| Facebook | facebook.com/FloorballInsport | Staro ime |
| YouTube | youtube.com/user/FBKInsport | Staro ime |
| FloorballFlash | ekipa FBK Loka | Logotip je JPEG |
| EOS | eos.fbkloka.si | |
| Nova stran | fbkloka.netlify.app | Do preklopa domene |

Štirje različni zapisi imena v profilih: fbk_loka, fbk.loka, FloorballInsport, FBKInsport.

## 8. Uradno, navada, lahko se spremeni

| Uradno (potrdi) | Navada | Lahko se spremeni brez prenove znaka |
|---|---|---|
| Ime v registru | Napis »FLOORBALL KLUB« | Imeni strani na Facebooku in YouTubu |
| Znak: palica, žogica, obrisa »k« in »a« | Zapis »FBK Loka« | Rumena na stari strani |
| Rumena in črna | Logotip na beli ali črni podlagi | Favicon in profilna slika (žogica) |

## 9. Vprašanja za klub

1. Kdo v klubu odobri uporabo znaka in novih različic?
2. Ali obstaja izvorna datoteka logotipa in kdo je avtor? Datoteko za FloorballFlash je pripravil Gorazd Tomc, morda ima izvor.
3. Katera pisava je v napisu »FLOORBALL KLUB«?
4. Uradne barve za tisk (CMYK ali Pantone) in barve dresov, tudi rezervnega?
5. Ali je znak zaščiten kot znamka? Preverba v TMview in WIPO še ni narejena.
6. Ali je »Skupaj rastemo. Skupaj zmagujemo.« uradno geslo?
7. Ali potrdite nove vektorske datoteke (`docs/znamka/pregled.png`)? Na strani so že v uporabi (odločitev Maja, 28. 9. 2026).
8. Ali naj stran na Facebooku in kanal na YouTubu preimenujemo v FBK Loka?
