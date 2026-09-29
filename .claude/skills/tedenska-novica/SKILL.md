---
name: tedenska-novica
description: Writes the short weekly match summary ("povzetek tedna") for fbkloka.si from tmp/week.json only (SPEC.md §20.5). Use when asked to write the weekly summary or when the weekly-news workflow runs.
---

# Povzetek tedna (FBK Loka)

The summary is published on the club site **without human review**. Your only job is to put the facts of
`tmp/week.json` into short, correct Slovenian sentences. A script (`node scripts/week-verify.ts <file>`) checks every
score, number and name against the data; if anything is not in the data, your text is thrown away and a fixed template
is published instead.

## Input

`tmp/week.json` (made by `node scripts/week-collect.ts`): `teden` (Monday and Sunday), `tekme` (every finished match of
the week: `ekipa`, `tekmovanje`, `dan`, `doma`, `nasprotnik`, `goliLoka`, `goliNasprotnik`, `izid`), `mvp` (or null)
and `prihodnje` (next week's matches: `ekipa`, `tekmovanje`, `dan`, `ura`, `doma`, `nasprotnik`).

The club publishes the fixed template (`templateSummary` in src/lib/week.ts) by default, because an AI text costs
API credits; this skill is for a manual or later AI version and must give the same facts.
Read nothing else. Do not search, do not use what you know about the club, the players or the opponents.

## Output

Only the Markdown body (no frontmatter), 2 to 5 sentences in total:

1. One short paragraph per team (`ekipa`), in match order.
2. A paragraph with the MVP, only when `mvp` is not null.
3. "## Naslednji teden" and one sentence per match of `prihodnje` ("Člani igrajo v soboto, 3. 10., ob 15:00 v IFL v
   gosteh proti ekipi FBC Dragons."), or "Naslednji teden ni tekem."

If `tekme` is empty, write nothing.

## Rules

- Only facts from `tmp/week.json`: who played, where (doma / v gosteh), which competition, which day, the result, the MVP
  and their numbers. Nothing else: no goal scorers other than the MVP, no standings, no next match, no reasons.
- No opinions and no predictions: never "odlično", "izjemno", "dramatično", "razburljivo", "zaslužena zmaga",
  "upamo", "pričakujemo" or similar. Say what happened, not how good it was.
- Scores exactly as in the data, from our side: `goliLoka:goliNasprotnik`, e.g. "s 7:8". Every other number must be in
  the data too (goals, assists, saves, dates).
- Names exactly as in the data (teams, competitions, opponents, the MVP). Never add a first name, a nickname or a
  position. Minors can be in the senior team: never an age, a school or a birth year.
- Grammar:
  - "z" or "s" before a score by the first sound of the first number read aloud: s 3–7, 13–17 and 30+ ("s 7:8",
    "s 5:4"), z otherwise ("z 12:6", "z 1:0").
  - Opponent names do not decline: "premagali ekipo FBC Borovnica", "izgubili proti ekipi C.Hamp VSV Unihockey",
    "igrali neodločeno z ekipo X".
  - Člani: "so premagali / izgubili"; Švigalice: "so premagale / izgubile"; other teams: "Ekipa U17 je premagala /
    izgubila".
  - Days in the accusative: "v soboto", "v nedeljo".
  - MVP numbers with Slovenian forms: 1 gol, 2 gola, 3 in 4 goli, 5 golov; 1 podaja, 2 podaji, 3 in 4 podaje, 5 podaj.

## Good examples

Data: člani, IFL, sobota doma 7:8 proti C.Hamp VSV Unihockey, nedelja v gosteh 5:4 proti FBC Borovnica; MVP Nejc Peklaj
3 goli in 1 podaja, nato 2 gola in 1 podaja.

> Člani so v soboto v IFL doma izgubili proti ekipi C.Hamp VSV Unihockey s 7:8. V nedeljo so v gosteh premagali ekipo
> FBC Borovnica s 5:4.
>
> MVP vikenda je Nejc Peklaj: proti ekipi C.Hamp VSV Unihockey 3 goli in 1 podaja, proti ekipi FBC Borovnica 2 gola in
> 1 podaja.

Data: U17, DP U17, sobota v gosteh 2:1 proti FBK Polanska banda; no MVP.

> Ekipa U17 je v soboto v DP U17 v gosteh premagala ekipo FBK Polanska banda z 2:1.

## Bad example (never like this)

> Člani so po dramatični tekmi za las izgubili proti VSV, a že naslednji dan zasluženo premagali Borovnico. Blestel je
> kapetan Nejc Peklaj s petimi goli, ki je z 22 leti eden najboljših strelcev lige.

Wrong: opinions ("dramatični", "za las", "zasluženo", "blestel"), a role that is not in the data ("kapetan"), an age,
a claim about the league, and a declined name ("Borovnico"): the check accepts names only as written in the data, so
always write the full name after "ekipo" / "ekipi".

## Check

After writing, run `node scripts/week-verify.ts <file>`. Fix every reported problem, or leave the week to the template.
