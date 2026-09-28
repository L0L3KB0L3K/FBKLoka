// Plato and prevoz for the senior team (SPEC.md §19). Bound to the Google Sheet "FBK Loka – plato in prevoz"
// on the club account. The Sheet is never published: data leaves only through doPost, and only with the team code.
//
// Entry points:
//   setup()        run once from the editor: creates the tabs, the daily trigger, fills matches and players,
//   refreshData()  daily trigger at 06:00: matches and new players from FloorballFlash,
//   doPost(e)      the web app the site calls: read data, or sign up / cancel.
// Rules and the data shape live in Rules.gs (tested in the repository), FloorballFlash calls in Ff.gs.

var TABS = {
  Nastavitve: ["kljuc", "vrednost"],
  Igralci: ["ime", "aktiven", "ffId"],
  Tekme: ["id", "zacetek", "tekmovanje", "nasprotnik", "doma", "prizorisce"],
  Prijave: ["casovniZig", "ime", "tekmaId", "vloga", "akcija", "status", "razlog"],
};

var DEFAULT_SETTINGS = [
  ["competitionIds", "738=IFL; 760=1. SFL"], // FloorballFlash competition id = label; change every season
  ["teamNames", "FBK Loka"], // our team name(s) in FloorballFlash, separated by ";"
  ["odjavaRokUr", "24"], // a plato can be cancelled until this many hours before the match; 0 = until the start
  ["skrbnikEmail", ""], // who gets an e-mail when the daily refresh fails; empty = the account owner
];

var CACHE_KEY = "data";
var CACHE_SECONDS = 60;

// ---------------------------------------------------------------------------------------------------------------
// Web app
// ---------------------------------------------------------------------------------------------------------------

/**
 * Body (text/plain, so the browser sends no preflight): {"code": "..."} or {"code": "...", "action": {...}}.
 * Answers: {"error": "bad_code"} (nothing is written), {"error": "busy"}, or the data (Rules.gs buildData)
 * plus "result": {"ok": true} | {"ok": false, "razlog": "..."} after an action.
 */
function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ error: "bad_request" });
  }

  var code = PropertiesService.getScriptProperties().getProperty("TEAM_CODE");
  if (!code || normalizeCode(body.code) !== normalizeCode(code)) return json({ error: "bad_code" });

  var cache = CacheService.getScriptCache();
  if (!body.action) {
    var cached = cache.get(CACHE_KEY);
    if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
    var text = JSON.stringify(buildData(readContext()));
    cache.put(CACHE_KEY, text, CACHE_SECONDS);
    return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
  }

  // One writer at a time: two people clicking "Prinesem jaz" at once cannot both get the plato.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json({ error: "busy" });
  }
  try {
    var ctx = readContext();
    var decision = decide(body.action, ctx);
    var sheet = tab("Prijave");
    // Every attempt is logged, rejected ones too (a trail for the admin). A wrong code is never logged.
    sheet.appendRow([
      new Date(ctx.now).toISOString(),
      cleanName(body.action.ime),
      Number(body.action.tekmaId) || "",
      String(body.action.vloga || ""),
      String(body.action.type || ""),
      decision.status,
      decision.razlog,
    ]);
    if (decision.cancelRow) sheet.getRange(decision.cancelRow, TABS.Prijave.indexOf("status") + 1).setValue("preklicano");
    SpreadsheetApp.flush();
    cache.remove(CACHE_KEY);

    var data = buildData(readContext());
    data.result = decision.status === "OK" ? { ok: true } : { ok: false, razlog: decision.razlog };
    return json(data);
  } finally {
    lock.releaseLock();
  }
}

/** Codes are compared without case and extra spaces: "Zelena Palica  Hitri Gol" = "zelena palica hitri gol". */
function normalizeCode(value) {
  return cleanName(value).toLowerCase();
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------------------------------------------

function tab(name) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet) throw new Error('Manjka zavihek "' + name + '". Zaženi setup().');
  return sheet;
}

/** Rows of a tab as objects keyed by the header, with `row` = the 1-based sheet row. */
function readRows(name) {
  var values = tab(name).getDataRange().getValues();
  var header = values.shift() || [];
  return values
    .map(function (cells, i) {
      var item = { row: i + 2 };
      header.forEach(function (key, c) {
        item[key] = cells[c];
      });
      return item;
    })
    .filter(function (item) {
      return header.some(function (key) {
        return item[key] !== "" && item[key] !== null;
      });
    });
}

function readSettings() {
  var settings = {};
  readRows("Nastavitve").forEach(function (item) {
    settings[String(item.kljuc).trim()] = String(item.vrednost).trim();
  });
  return settings;
}

/** Everything Rules.gs needs, read fresh from the Sheet. */
function readContext() {
  var settings = readSettings();
  return {
    players: readRows("Igralci")
      .filter(function (p) {
        return p.aktiven === true || String(p.aktiven).toUpperCase() === "TRUE";
      })
      .map(function (p) {
        return cleanName(p.ime);
      })
      .filter(function (name, i, all) {
        return name !== "" && all.indexOf(name) === i;
      }),
    matches: readRows("Tekme").map(function (m) {
      return {
        id: Number(m.id),
        zacetek: String(m.zacetek),
        tekmovanje: String(m.tekmovanje),
        nasprotnik: String(m.nasprotnik),
        doma: m.doma === true || String(m.doma).toUpperCase() === "TRUE",
        prizorisce: String(m.prizorisce),
      };
    }),
    rows: readRows("Prijave").map(function (r) {
      return {
        row: r.row,
        ime: String(r.ime),
        tekmaId: Number(r.tekmaId),
        vloga: String(r.vloga).trim(),
        akcija: String(r.akcija).trim(),
        status: String(r.status).trim(),
      };
    }),
    now: Date.now(),
    settings: { odjavaRokUr: Number(settings.odjavaRokUr) || 0 },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Daily refresh from FloorballFlash
// ---------------------------------------------------------------------------------------------------------------

/**
 * Matches: upsert by id (never deleted, the counters need past matches). Players: new FloorballFlash ids are added
 * as active; existing rows are left alone, so the admin's "aktiven = FALSE" stays. A failed competition keeps its old
 * rows; the admin gets an e-mail.
 */
function refreshData() {
  var settings = readSettings();
  var teamNames = String(settings.teamNames || "FBK Loka").split(";").map(cleanName).filter(Boolean);
  var competitions = String(settings.competitionIds || "")
    .split(";")
    .map(function (part) {
      var pair = part.split("=");
      return { id: Number(pair[0]), label: cleanName(pair[1] || pair[0]) };
    })
    .filter(function (c) {
      return c.id > 0;
    });

  var matches = [];
  var players = [];
  var errors = [];
  competitions.forEach(function (c) {
    try {
      var result = ffCompetition(c.id, c.label, teamNames);
      matches = matches.concat(result.matches);
      result.teamIds.forEach(function (teamId) {
        players = players.concat(ffPlayers(c.id, teamId));
      });
    } catch (err) {
      errors.push(c.label + " (" + c.id + "): " + err.message);
    }
  });

  upsertMatches(matches);
  addNewPlayers(players);
  CacheService.getScriptCache().remove(CACHE_KEY);

  if (errors.length) {
    var to = settings.skrbnikEmail || Session.getEffectiveUser().getEmail();
    MailApp.sendEmail(to, "FBK Loka plato/prevoz: osvežitev tekem ni uspela", errors.join("\n") + "\n\nStari podatki ostanejo.");
  }
}

function upsertMatches(matches) {
  var sheet = tab("Tekme");
  var existing = {};
  readRows("Tekme").forEach(function (m) {
    existing[Number(m.id)] = m.row;
  });
  matches.forEach(function (m) {
    var values = [[m.id, m.zacetek, m.tekmovanje, m.nasprotnik, m.doma, m.prizorisce]];
    if (existing[m.id]) sheet.getRange(existing[m.id], 1, 1, 6).setValues(values);
    else sheet.appendRow(values[0]);
  });
}

function addNewPlayers(players) {
  var sheet = tab("Igralci");
  var rows = readRows("Igralci");
  var knownIds = {};
  var knownNames = {};
  rows.forEach(function (p) {
    if (p.ffId) knownIds[Number(p.ffId)] = true;
    knownNames[cleanName(p.ime)] = true;
  });
  players.forEach(function (p) {
    if (knownIds[p.ffId] || knownNames[p.ime]) return;
    sheet.appendRow([p.ime, true, p.ffId]);
    knownIds[p.ffId] = true;
    knownNames[p.ime] = true;
  });
}

// ---------------------------------------------------------------------------------------------------------------
// One-time setup
// ---------------------------------------------------------------------------------------------------------------

/** Run once from the editor (Run > setup). Safe to run again: it only adds what is missing. */
function setup() {
  var book = SpreadsheetApp.getActive();
  Object.keys(TABS).forEach(function (name) {
    var sheet = book.getSheetByName(name) || book.insertSheet(name);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(TABS[name]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, TABS[name].length).setFontWeight("bold");
    }
  });
  // Start times and timestamps stay text, so Sheets does not turn them into its own dates.
  tab("Tekme").getRange("B:B").setNumberFormat("@");
  tab("Prijave").getRange("A:A").setNumberFormat("@");

  var settings = tab("Nastavitve");
  var have = readSettings();
  DEFAULT_SETTINGS.forEach(function (pair) {
    if (!(pair[0] in have)) settings.appendRow(pair);
  });

  var hasTrigger = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === "refreshData";
  });
  if (!hasTrigger) ScriptApp.newTrigger("refreshData").timeBased().everyDays(1).atHour(6).create();

  refreshData();
}
