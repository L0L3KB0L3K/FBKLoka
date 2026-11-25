# Instagram API: navodila za povezavo s spletno stranjo

Stanje: 25. 11. 2026. Namen: da lahko skripta na GitHubu enkrat na teden prebere objave z Instagrama `fbk_loka`
(slike in opis) in jih zapiše med novice (SPEC §6). Načrt skripte: `scripts/fetch-ig.ts` še ne obstaja.

Ta datoteka ne vsebuje žetonov ali gesel. Žetonov nikoli ne piši vanjo, v Git, v klepet ali v e-pošto brez šifriranja.

## Kdo kaj dela

| Kdo | Naloga |
|---|---|
| **Prijatelj** (ima razvijalski račun) | Ustvari aplikacijo, doda račun kluba, požene test |
| **Oseba z geslom računa `fbk_loka`** | Sama vtipka prijavo v račun kluba. Gesla nikomur ne pove |
| **Maj** | Žeton vnese v GitHub Secrets in po testu javi "dela" |

## Pred začetkom

- [ ] Instagram račun `fbk_loka` je **Business ali Creator** (Profil, Nastavitve, Vrsta računa).
- [ ] Račun je **javen**. Dokumentacija pravi, da mora biti račun javen.
- [ ] Oseba z geslom ima pri roki tudi drugi faktor (kodo po SMS ali v aplikaciji), če ga račun uporablja.
- [ ] Facebook stran kluba **ni potrebna**. Ta pot uporablja samo Instagram (Instagram API with Instagram Login).

## A. Prijatelj: aplikacija

Imena gumbov so iz uradne dokumentacije Meta (12. 11. 2026). Meta jih pogosto prestavlja.

1. Odpri `developers.facebook.com` in se prijavi. Če še nimaš razvijalskega računa, ga ustvari (zahteva potrditev telefonske številke).
2. Klikni **Create App**.
3. Ime: na primer "FBK Loka spletna stran". Kontaktni e-mail: **klubski**, ne zasebni.
4. Primer uporabe: **Other**. Vrsta aplikacije: **Business**. Nato **Create app**. Če vpraša po povezavi s podjetjem, to preskoči.
5. V nadzorni plošči pri izdelku **Instagram** klikni **Set up**. Odpre se **API setup with Instagram login**.
6. **Ne klikaj** "Complete App Review" in aplikacije ne preklopi na **Live**. Ostane v razvojnem načinu.
7. Dodaj še enega skrbnika, da aplikacija ni vezana samo na tvoj račun: **App Roles > Roles > Add People**, vloga Administrator.
   Skrbnik mora imeti **lasten Meta razvijalski račun** (Meta, App Roles, 25. 11. 2026). Predlog: nekdo iz kluba, ki mu SMS pride.

## B. Račun kluba kot tester

8. **App Roles > Roles**: dodaj račun `fbk_loka` kot **Instagram Tester**. [nepreverjeno danes: točno ime vloge]
9. Oseba z geslom odpre Instagram na telefonu: **Settings > Website permissions > Apps and websites > Tester invites** in sprejme povabilo. [nepreverjeno danes: točna pot v meniju]

## C. Žeton

10. V razdelku **Generate access tokens** klikni **Add account** ali **Generate token** ob računu `fbk_loka`.
11. Odpre se prijava v Instagram. **Prijavo vtipka oseba z geslom** (na prijateljevem računalniku v zasebnem oknu ali prek deljenja zaslona). Prijatelj gesla ne vidi in ga ne zapiše.
12. Ob vprašanju o dovoljenjih potrdi `instagram_business_basic` (branje profila in objav, brez objavljanja).
13. Kopiraj žeton. Velja 60 dni. Nastavi tudi ID računa, ki je v isti nadzorni plošči (polje `user_id`).

## D. Test (prijatelj)

Ukaze poženi v terminalu z `curl`: Mac, Linux, na Windowsu Git Bash ali WSL. Žeton vtipkaj, ko ga vpraša. Pri vnosu ni viden in ostane samo v tej seji.

```bash
read -rs IG_TOKEN
```

```bash
curl "https://graph.instagram.com/v27.0/me?fields=user_id,username&access_token=$IG_TOKEN"
```

```bash
curl "https://graph.instagram.com/v27.0/me/media?fields=id,caption,media_type,permalink,timestamp&limit=3&access_token=$IG_TOKEN"
```

(Različica `v27.0` je iz dokumentacije z dne 12. 11. 2026.)

**Pričakovano:**
- prvi ukaz: JSON z `"username":"fbk_loka"`,
- drugi ukaz: zadnje 3 objave z opisom (`caption`) in povezavo (`permalink`).

**Pošlji Maju samo izpis obeh ukazov. Žetona ne pošiljaj v izpisu.**

### Če test ne uspe

| Napaka | Verjeten vzrok in rešitev |
|---|---|
| Prvi ukaz vrne napako o žetonu | Žeton je napačno kopiran ali pretečen. Ustvari ga znova (korak 10) |
| Prvi uspe, drugi vrne napako o dovoljenjih ali o aplikaciji, ki ni "live" | Verjetno Meta zahteva App Review. **Ustavi se**, ne začni pregleda. Pošlji Maju samo besedilo napake. Pregled traja tedne |
| Račun se ne pojavi pri dodajanju | Račun ni Business/Creator ali ni javen. Preveri "Pred začetkom" |
| Povabilo za testerja ne pride | Preveri v Instagramu pod Tester invites. Povabilo pošlji znova |

## E. Predaja žetona

- Prijatelj pošlje žeton **in** `user_id` Maju prek šifriranega kanala (Signal ali Proton Mail), ne v javni klepet in ne v navadno e-pošto.
- **Maj** v GitHubu: repozitorij, **Settings > Secrets and variables > Actions > New repository secret**:
  - `IG_ACCESS_TOKEN` = žeton,
  - `IG_USER_ID` = ID računa.
- Prijatelj nato sporočilo z žetonom izbriše. Žeton je mogoče kadar koli razveljaviti v nadzorni plošči.
- Če je žeton pomotoma objavljen: v nadzorni plošči ga razveljavi in ustvari novega.

## F. Česa ne delati

- Ne deli gesla računa `fbk_loka`.
- Ne preklapljaj aplikacije v **Live** in ne pošiljaj aplikacije v App Review brez dogovora z Majem.
- Ne dodajaj drugih dovoljenj kot `instagram_business_basic`.
- Žetona ne piši v Git, v kodo, v `docs/` ali v zasebne zapiske brez šifriranja.

## G. Kaj sledi

1. Maj prejme izpis testa, javi "dela" in doda skrivnosti v GitHub.
2. Skripta `scripts/fetch-ig.ts` dobi suhi zagon (`--dry-run`), ki samo izpiše objave. Pravi zapis sledi po pregledu seznama.
3. Žeton se osvežuje vsak teden (osvežitev je možna po 24 urah, dokler žeton ni pretekel). Žeton, ki ni bil osvežen 60 dni, pade in ga ni več mogoče osvežiti: takrat je treba ponoviti korake 10 do 13.
4. Osvežen žeton je treba shraniti nazaj v GitHub Secrets. To zahteva ozek osebni žeton z dovoljenjem samo za Secrets. Dogovor je odprt (glej načrt v klepetu 12. 11. 2026).

## Viri in kaj ni preverjeno

Preverjeno v uradni dokumentaciji Meta 12. 11. 2026 (`developers.facebook.com/documentation/instagram-platform/`):
vrsta aplikacije Business, izdelek Instagram, dovoljenje `instagram_business_basic`, gostitelj `graph.instagram.com`,
žeton 60 dni, osvežitev po vsaj 24 urah.

Nepreverjeno: ali za račun z vlogo v aplikaciji App Review sploh velja; točna imena vloge in menija za Instagram Tester;
delovanje `children` (albumi) in `thumbnail_url` (videi) v praksi.
