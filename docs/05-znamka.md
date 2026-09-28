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
| `src/assets/logo/logo-dark.png` | PNG 1772×790, črna podlaga, brez prosojnosti | V glavi strani |
| `src/assets/logo/logo-light.png` | PNG 1772×790, bela podlaga, brez prosojnosti | Vir za vektor |
| FloorballFlash »LOGO - FBK Loka - (končni).svg« | JPEG 1812×828 v ovoju SVG. Ni vektor. Podatki v datoteki: ACDSee, 20. 10. 2024, Gorazd Tomc | Na FloorballFlash |
| `src/assets/logo/*.svg` | Vektor (poti), 28. 9. 2026 | Na strani od 28. 9. 2026: glava, favicon, slika za deljenje, lestvica. Klub še potrdi |

[MANJKA] izvorna datoteka oblikovalca (AI, PDF, EPS ali SVG s potmi) in avtor znaka.

### Nove vektorske datoteke (`src/assets/logo/`)

Ista mapa kot za spletno stran, da je vir en sam: ob spremembi datoteke se stran zgradi znova.

| Datoteka | Za kaj |
|---|---|
| `logo-na-svetlem.svg` | Bela in svetla podlaga, dokumenti |
| `logo-na-temnem.svg` | Črna in temna podlaga, glava in noga strani |
| `logo-na-svetlem-brez-napisa.svg`, `logo-na-temnem-brez-napisa.svg` | Majhne velikosti (pod okoli 200 px širine), kjer napis ni berljiv. Črta je neprekinjena: to je izpeljava, ne izvirnik |
| `logo-enobarvni-crn.svg`, `logo-enobarvni-bel.svg` | Tisk v eni barvi, vezenje, žig |
| `zogica.svg`, `zogica-crna.svg`, `zogica-bela.svg` | Favicon, profilna slika, 16–64 px |

Pregled vseh različic: `docs/znamka/pregled.png`.

Kako so nastale: brez AI generatorja slik. Obrisi, palica, črta in napis so sledeni (potrace) iz
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
| Rumena (žogica, napis) | `#fff112`, RGB 255 241 18 | Izmerjeno iz logotipa | [MANJKA] CMYK ali Pantone za tisk |
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

- 3 fotografije članov s stare strani, 2000 px, še v dresih Insport. Uporabljene na naslovnici in /klub. [MANJKA] avtor.
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
