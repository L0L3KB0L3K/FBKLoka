// Pure rules for plato and prevoz (SPEC.md §19.4). No Sheet, no Google services: tests/ekipa-rules.test.ts
// loads this very file in Node, so the rules on the server and the tests cannot drift apart.
//
// Club decisions (28. 9. 2026):
// - plato: every match of the senior team (IFL and 1. SFL), home and away, one person per match,
// - prevoz: away matches only, several drivers per match, the same person once,
// - only active players can sign up (also as drivers),
// - a plato can be cancelled until `odjavaRokUr` hours before the match (24 in the Sheet); drivers any time before.
// Rows are never deleted: a cancellation marks the sign-up `preklicano` and logs the cancellation itself.

/** "Miha  Triler " -> "Miha Triler": the same person however the name was typed. */
function cleanName(name) {
  return String(name === null || name === undefined ? "" : name)
    .split(" ")
    .filter(function (part) {
      return part !== "";
    })
    .join(" ");
}

function reject(razlog) {
  return { status: "zavrnjeno", razlog: razlog };
}

/** Sign-ups that currently count: action "prijava", status "OK", for this match and role. */
function activeSignups(rows, matchId, vloga) {
  return rows.filter(function (row) {
    return row.akcija === "prijava" && row.status === "OK" && Number(row.tekmaId) === Number(matchId) && row.vloga === vloga;
  });
}

/**
 * Decides one action. Checks run in this order (SPEC.md §19.4, plus "domaca tekma" for prevoz):
 *   unknown action -> unknown name -> unknown match -> match started -> prevoz for a home match ->
 *   sign-up: already signed up -> plato taken -> OK
 *   cancellation: nothing to cancel -> plato after the deadline -> OK (cancelRow = the sign-up to mark "preklicano")
 * "podvojeno" is checked before "zasedeno", so a player who holds the plato and clicks again is told the right thing.
 *
 * @param action {type: "prijava"|"odjava", vloga: "plato"|"prevoz", ime, tekmaId}
 * @param ctx {players: string[] (active, clean), matches: {id, zacetek, doma}[], rows: sign-up rows, now: ms,
 *             settings: {odjavaRokUr: number}}
 * @returns {status: "OK"|"zavrnjeno", razlog: string, cancelRow?: number}
 */
function decide(action, ctx) {
  var type = action && action.type;
  var vloga = action && action.vloga;
  if ((type !== "prijava" && type !== "odjava") || (vloga !== "plato" && vloga !== "prevoz")) {
    return reject("neznano dejanje");
  }

  var ime = cleanName(action.ime);
  if (ctx.players.indexOf(ime) === -1) return reject("neznano ime");

  var match = null;
  for (var i = 0; i < ctx.matches.length; i++) {
    if (Number(ctx.matches[i].id) === Number(action.tekmaId)) match = ctx.matches[i];
  }
  if (!match) return reject("neznana tekma");

  var start = Date.parse(match.zacetek);
  if (!(start > ctx.now)) return reject("tekma mimo");
  if (vloga === "prevoz" && match.doma) return reject("domaca tekma");

  var active = activeSignups(ctx.rows, match.id, vloga);
  var mine = active.filter(function (row) {
    return cleanName(row.ime) === ime;
  });

  if (type === "prijava") {
    if (mine.length > 0) return reject("podvojeno");
    if (vloga === "plato" && active.length > 0) return reject("zasedeno");
    return { status: "OK", razlog: "" };
  }

  if (mine.length === 0) return reject("ni prijave");
  var hours = Number(ctx.settings && ctx.settings.odjavaRokUr) || 0;
  if (vloga === "plato" && hours > 0 && start - ctx.now < hours * 3600 * 1000) return reject("po roku");
  return { status: "OK", razlog: "", cancelRow: mine[mine.length - 1].row };
}

function byName(a, b) {
  return a.localeCompare(b, "sl");
}

/**
 * The data the site shows (SPEC.md §19.4 "Oblika odgovora").
 * - igralci: active players, by name (the list to pick "my name" from),
 * - tekme: matches that have not started, by time; plato = name or null; prevoz = names (away) or null (home),
 * - stevci: plato and prevoz per active player, 0 included, most first. Only matches that have started count:
 *   the counters say who has brought or driven, not who has signed up for later,
 * - pravila: what the page needs to show the deadline.
 */
function buildData(ctx) {
  var players = ctx.players.slice().sort(byName);
  var upcoming = ctx.matches
    .filter(function (match) {
      return Date.parse(match.zacetek) > ctx.now;
    })
    .sort(function (a, b) {
      return Date.parse(a.zacetek) - Date.parse(b.zacetek);
    })
    .map(function (match) {
      var plato = activeSignups(ctx.rows, match.id, "plato");
      var prevoz = activeSignups(ctx.rows, match.id, "prevoz");
      return {
        id: Number(match.id),
        zacetek: match.zacetek,
        tekmovanje: match.tekmovanje,
        nasprotnik: match.nasprotnik,
        doma: Boolean(match.doma),
        prizorisce: match.prizorisce,
        plato: plato.length > 0 ? cleanName(plato[0].ime) : null,
        prevoz: match.doma
          ? null
          : prevoz.map(function (row) {
              return cleanName(row.ime);
            }),
      };
    });

  var started = {};
  ctx.matches.forEach(function (match) {
    if (Date.parse(match.zacetek) <= ctx.now) started[Number(match.id)] = true;
  });
  function counter(vloga) {
    var n = {};
    players.forEach(function (name) {
      n[name] = 0;
    });
    ctx.rows.forEach(function (row) {
      var name = cleanName(row.ime);
      if (row.akcija === "prijava" && row.status === "OK" && row.vloga === vloga && started[Number(row.tekmaId)] && name in n) {
        n[name] += 1;
      }
    });
    return players
      .map(function (name) {
        return { ime: name, n: n[name] };
      })
      .sort(function (a, b) {
        return b.n - a.n || byName(a.ime, b.ime);
      });
  }

  return {
    generatedAt: new Date(ctx.now).toISOString(),
    igralci: players,
    tekme: upcoming,
    stevci: { plato: counter("plato"), prevoz: counter("prevoz") },
    pravila: { odjavaRokUr: Number(ctx.settings && ctx.settings.odjavaRokUr) || 0 },
  };
}
