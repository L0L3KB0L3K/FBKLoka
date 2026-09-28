# Plato in prevoz: Google Sheet in Apps Script

Zaledje za skriti strani `/ekipa/plato/` in `/ekipa/prevoz/` (SPEC.md §19). Vse je na **klubskem** Google računu, ne na osebnem.
Sheet se nikoli ne objavi na splet: v njem so imena mladoletnih igralcev. Podatki gredo ven samo prek Apps Scripta in samo z ekipno kodo.

Datoteke v tej mapi:

| Datoteka | Kaj dela |
|---|---|
| `Code.gs` | Spletna aplikacija (`doPost`), branje in pisanje Sheeta, dnevna osvežitev, `setup()` |
| `Rules.gs` | Pravila (kdo se lahko prijavi, zaseden plato, rok za odjavo) in oblika podatkov. Testirano v repozitoriju (`tests/ekipa-rules.test.ts`) |
| `Ff.gs` | Tekme in igralci s FloorballFlash |
| `appsscript.json` | Časovni pas, dovoljenja, nastavitve spletne aplikacije |

## Namestitev (enkrat, okoli 15 minut)

1. **Sheet.** Prijavi se v klubski Google račun. V Google Drive ustvari nov Google Sheet z imenom `FBK Loka – plato in prevoz`.
2. **Apps Script.** V Sheetu: *Razširitve → Apps Script*. Odpre se urejevalnik, vezan na ta Sheet.
3. **Koda.** V urejevalniku:
   - izbriši vsebino datoteke `Code.gs` in prilepi vsebino `Code.gs` iz te mape,
   - z gumbom **+** dodaj datoteki `Rules.gs` in `Ff.gs` (tip *Script*) in prilepi vsebino,
   - *Nastavitve projekta (zobnik) → Pokaži datoteko manifesta »appsscript.json«*, nato prilepi vsebino `appsscript.json`.
4. **Ekipna koda.** *Nastavitve projekta → Lastnosti skripta → Dodaj lastnost*: ime `TEAM_CODE`, vrednost štiri naključne besede
   (npr. `zelena palica hitri gol`, ne te). Koda je edina zaščita, zato naj bo dolga. Velike črke in presledki niso pomembni.
5. **Prvi zagon.** V urejevalniku izberi funkcijo `setup` in klikni *Zaženi*. Google vpraša za dovoljenja (Sheet, zunanji klic
   na FloorballFlash, e-pošta ob napaki, sprožilec). Potrdi. `setup` ustvari zavihke, dnevni sprožilec ob 6.00 in napolni tekme
   ter igralce. Preveri zavihka `Tekme` in `Igralci`.
6. **Objava.** *Uvedi → Nova uvedba → Tip: Spletna aplikacija*. *Izvedi kot: Jaz* (klubski račun), *Kdo ima dostop: Vsi*.
   Kopiraj URL, ki se konča z `/exec`.
7. **Povezava s stranjo.** URL vpiši v `src/config/ekipa.ts` namesto `"TODO"` in pushaj. Stran je nato povezana.
8. **Deljenje.** V ekipno skupino pošlji povezavo `https://fbkloka.si/ekipa/plato/` in ekipno kodo. Na javni strani povezave ni.

Ko spremeniš kodo v urejevalniku, naredi *Uvedi → Upravljaj uvedbe → Uredi → Nova različica*, da URL ostane isti.

## Zavihki v Sheetu

| Zavihek | Stolpci | Kdo piše |
|---|---|---|
| `Nastavitve` | `kljuc`, `vrednost` | Skrbnik |
| `Igralci` | `ime`, `aktiven`, `ffId` | Skript doda nove igralce iz FloorballFlash, skrbnik ureja `aktiven` |
| `Tekme` | `id`, `zacetek`, `tekmovanje`, `nasprotnik`, `doma`, `prizorisce` | Skript, vsak dan ob 6.00 |
| `Prijave` | `casovniZig`, `ime`, `tekmaId`, `vloga`, `akcija`, `status`, `razlog` | Skript ob vsakem kliku |

Nastavitve (`setup` jih vpiše sam):

| `kljuc` | Privzeto | Pomen |
|---|---|---|
| `competitionIds` | `738=IFL; 760=1. SFL` | Tekmovanja na FloorballFlash. **Vsako sezono nova številka.** |
| `teamNames` | `FBK Loka` | Ime naše ekipe na FloorballFlash |
| `odjavaRokUr` | `24` | Plato se lahko odjavi najkasneje toliko ur pred tekmo. `0` = do začetka tekme |
| `skrbnikEmail` | prazno | Kdo dobi e-pošto, če osvežitev ne uspe (prazno = lastnik računa) |

## Pravila (odločitve kluba, 28. 9. 2026)

- **Plato:** vse tekme članov (IFL in 1. SFL), doma in v gosteh. En igralec na tekmo, kdor prvi izbere, ga ima.
- **Prevoz:** samo gostujoče tekme. Več voznikov na tekmo, ista oseba enkrat.
- **Kdo:** samo aktivni igralci iz zavihka `Igralci`, tudi za prevoz.
  Pozor: na uradnem seznamu so tudi mladoletni igralci. Če se tak igralec prijavi kot voznik, skrbnik njegovo vrstico nastavi na `preklicano`.
- **Števca:** štejejo samo tekme, ki so že bile.

## Popravki (skrbnik)

- Vrstice se nikoli ne brišejo. Za popravek v zavihku `Prijave` spremeni `status` (`OK` ali `preklicano`) ali `ime`.
  Stran spremembo pokaže v največ 60 sekundah.
- Igralec ni več v ekipi ali ne želi biti na seznamu: v `Igralci` nastavi `aktiven` na `FALSE`. Skript ga ne vrne nazaj.
- Zapisani so tudi zavrnjeni poskusi (`status` = `zavrnjeno`, `razlog`), napačna koda pa ne.

## Vsako sezono

1. Nova koda: *Lastnosti skripta → TEAM_CODE*. Pošlji jo v ekipno skupino.
2. Nova tekmovanja v `Nastavitve → competitionIds` (številke najdeš na FloorballFlash ali z `npm run scan:ff` v repozitoriju).
3. Zavihek `Prijave` kopiraj v arhiv (nov zavihek ali nov Sheet) in ga izprazni do glave. Števca se začneta znova.

## Omejitve

- Kdor ima kodo, se lahko prijavi pod katerim koli imenom. Vse se zapiše s časom, zato skrbnik vidi, kaj se je zgodilo.
  Če bi prišlo do zlorab, lahko dodamo osebne PIN-e.
- Odgovor Apps Scripta traja 1–3 sekunde. Branje se predpomni 60 sekund.
- Ob napaki FloorballFlash ostanejo stare tekme, skrbnik dobi e-pošto.
