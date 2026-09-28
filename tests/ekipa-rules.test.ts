// Tests for the plato and prevoz rules (SPEC.md §19.4). Loads apps-script/ekipa/Rules.gs itself in a Node vm,
// so the Apps Script code is tested, not a copy. One test per row of the rules table, plus the counters.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

type Row = { row: number; ime: string; tekmaId: number; vloga: string; akcija: string; status: string };
type Match = { id: number; zacetek: string; tekmovanje: string; nasprotnik: string; doma: boolean; prizorisce: string };
type Ctx = { players: string[]; matches: Match[]; rows: Row[]; now: number; settings: { odjavaRokUr: number } };
type Decision = { status: string; razlog: string; cancelRow?: number };

const sandbox: Record<string, unknown> = {};
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL("../apps-script/ekipa/Rules.gs", import.meta.url), "utf8"), sandbox);
// Objects from the vm come from another realm; a JSON round trip makes them plain for deepStrictEqual.
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const decideRaw = sandbox.decide as (action: object, ctx: Ctx) => Decision;
const decide = (action: object, ctx: Ctx) => plain(decideRaw(action, ctx));
const buildDataRaw = sandbox.buildData as (ctx: Ctx) => {
  igralci: string[];
  tekme: { id: number; plato: string | null; prevoz: string[] | null }[];
  stevci: { plato: { ime: string; n: number }[]; prevoz: { ime: string; n: number }[] };
  pravila: { odjavaRokUr: number };
};
const buildData = (ctx: Ctx) => plain(buildDataRaw(ctx));

const NOW = Date.parse("2026-10-01T12:00:00+02:00");
const HOME = { id: 1, zacetek: "2026-10-10T17:00:00+02:00", tekmovanje: "IFL", nasprotnik: "KAC Floorball", doma: true, prizorisce: "Dvorana Poden" };
const AWAY = { id: 2, zacetek: "2026-10-03T15:00:00+02:00", tekmovanje: "IFL", nasprotnik: "FBC Dragons", doma: false, prizorisce: "Alterlaa" };
const SOON = { id: 3, zacetek: "2026-10-02T10:00:00+02:00", tekmovanje: "1. SFL", nasprotnik: "FBC Borovnica", doma: true, prizorisce: "Dvorana Poden" };
const PAST = { id: 4, zacetek: "2026-09-26T17:00:00+02:00", tekmovanje: "IFL", nasprotnik: "VSV", doma: true, prizorisce: "Dvorana Poden" };

const ctx = (rows: Row[] = []): Ctx => ({
  players: ["Ana Novak", "Bor Kos", "Cene Zupan"],
  matches: [HOME, AWAY, SOON, PAST],
  rows,
  now: NOW,
  settings: { odjavaRokUr: 24 },
});
const row = (n: number, ime: string, tekmaId: number, vloga: string, akcija = "prijava", status = "OK"): Row => ({
  row: n,
  ime,
  tekmaId,
  vloga,
  akcija,
  status,
});
const act = (type: string, vloga: string, ime: string, tekmaId: number) => ({ type, vloga, ime, tekmaId });

test("unknown action or role is rejected", () => {
  assert.equal(decide(act("brisi", "plato", "Ana Novak", 1), ctx()).razlog, "neznano dejanje");
  assert.equal(decide(act("prijava", "hrana", "Ana Novak", 1), ctx()).razlog, "neznano dejanje");
});

test("name that is not an active player: zavrnjeno / neznano ime", () => {
  assert.deepEqual(decide(act("prijava", "plato", "Neznanec", 1), ctx()), { status: "zavrnjeno", razlog: "neznano ime" });
});

test("names are compared without extra spaces", () => {
  assert.equal(decide(act("prijava", "plato", "  Ana   Novak ", 1), ctx()).status, "OK");
});

test("match not in the list: zavrnjeno / neznana tekma", () => {
  assert.equal(decide(act("prijava", "plato", "Ana Novak", 999), ctx()).razlog, "neznana tekma");
});

test("match already started: zavrnjeno / tekma mimo", () => {
  assert.equal(decide(act("prijava", "plato", "Ana Novak", PAST.id), ctx()).razlog, "tekma mimo");
});

test("prevoz for a home match: zavrnjeno / domaca tekma", () => {
  assert.equal(decide(act("prijava", "prevoz", "Ana Novak", HOME.id), ctx()).razlog, "domaca tekma");
});

test("plato sign-up on a free match: OK (home and away)", () => {
  assert.deepEqual(decide(act("prijava", "plato", "Ana Novak", HOME.id), ctx()), { status: "OK", razlog: "" });
  assert.equal(decide(act("prijava", "plato", "Ana Novak", AWAY.id), ctx()).status, "OK");
});

test("plato already taken by someone else: zavrnjeno / zasedeno", () => {
  const rows = [row(2, "Bor Kos", HOME.id, "plato")];
  assert.equal(decide(act("prijava", "plato", "Ana Novak", HOME.id), ctx(rows)).razlog, "zasedeno");
});

test("same person, same match and role again: zavrnjeno / podvojeno", () => {
  assert.equal(decide(act("prijava", "plato", "Ana Novak", HOME.id), ctx([row(2, "Ana Novak", HOME.id, "plato")])).razlog, "podvojeno");
  assert.equal(decide(act("prijava", "prevoz", "Ana Novak", AWAY.id), ctx([row(2, "Ana Novak", AWAY.id, "prevoz")])).razlog, "podvojeno");
});

test("prevoz: several drivers on one away match are all OK", () => {
  const rows = [row(2, "Bor Kos", AWAY.id, "prevoz"), row(3, "Cene Zupan", AWAY.id, "prevoz")];
  assert.equal(decide(act("prijava", "prevoz", "Ana Novak", AWAY.id), ctx(rows)).status, "OK");
});

test("a cancelled sign-up does not block the plato", () => {
  const rows = [row(2, "Bor Kos", HOME.id, "plato", "prijava", "preklicano")];
  assert.equal(decide(act("prijava", "plato", "Ana Novak", HOME.id), ctx(rows)).status, "OK");
});

test("cancelling without a sign-up: zavrnjeno / ni prijave", () => {
  assert.equal(decide(act("odjava", "plato", "Ana Novak", HOME.id), ctx()).razlog, "ni prijave");
  // Someone else's plato cannot be cancelled in their name.
  assert.equal(decide(act("odjava", "plato", "Ana Novak", HOME.id), ctx([row(2, "Bor Kos", HOME.id, "plato")])).razlog, "ni prijave");
});

test("cancelling a plato less than 24 h before the match: zavrnjeno / po roku", () => {
  const rows = [row(2, "Ana Novak", SOON.id, "plato")];
  assert.equal(decide(act("odjava", "plato", "Ana Novak", SOON.id), ctx(rows)).razlog, "po roku");
});

test("no deadline for drivers, and none for plato when odjavaRokUr is 0", () => {
  const soonAway = { ...SOON, id: 5, doma: false };
  const c = { ...ctx([row(2, "Ana Novak", 5, "prevoz"), row(3, "Ana Novak", SOON.id, "plato")]), matches: [HOME, AWAY, SOON, PAST, soonAway] };
  assert.equal(decide(act("odjava", "prevoz", "Ana Novak", 5), c).status, "OK");
  assert.equal(decide(act("odjava", "plato", "Ana Novak", SOON.id), { ...c, settings: { odjavaRokUr: 0 } }).status, "OK");
});

test("cancelling in time: OK and the latest active sign-up row is returned to be marked preklicano", () => {
  const rows = [row(2, "Ana Novak", HOME.id, "plato", "prijava", "preklicano"), row(5, "Ana Novak", HOME.id, "plato")];
  assert.deepEqual(decide(act("odjava", "plato", "Ana Novak", HOME.id), ctx(rows)), { status: "OK", razlog: "", cancelRow: 5 });
});

test("data: upcoming matches only, plato name, prevoz only for away matches", () => {
  const rows = [row(2, "Bor Kos", HOME.id, "plato"), row(3, "Ana Novak", AWAY.id, "prevoz"), row(4, "Cene Zupan", AWAY.id, "prevoz")];
  const data = buildData(ctx(rows));
  assert.deepEqual(
    data.tekme.map((m) => m.id),
    [SOON.id, AWAY.id, HOME.id],
  );
  const home = data.tekme.find((m) => m.id === HOME.id);
  const away = data.tekme.find((m) => m.id === AWAY.id);
  assert.equal(home?.plato, "Bor Kos");
  assert.equal(home?.prevoz, null);
  assert.deepEqual(away?.prevoz, ["Ana Novak", "Cene Zupan"]);
  assert.equal(away?.plato, null);
  assert.equal(data.pravila.odjavaRokUr, 24);
});

test("counters: every active player, 0 included, only matches that have started, most first", () => {
  const rows = [
    row(2, "Bor Kos", PAST.id, "plato"),
    row(3, "Bor Kos", HOME.id, "plato"), // upcoming: not counted yet
    row(4, "Ana Novak", PAST.id, "prevoz", "prijava", "preklicano"), // cancelled: not counted
    row(5, "Neznanec", PAST.id, "plato"), // not an active player: not listed
  ];
  const { stevci } = buildData(ctx(rows));
  assert.deepEqual(stevci.plato, [
    { ime: "Bor Kos", n: 1 },
    { ime: "Ana Novak", n: 0 },
    { ime: "Cene Zupan", n: 0 },
  ]);
  assert.ok(stevci.prevoz.every((p) => p.n === 0));
});
