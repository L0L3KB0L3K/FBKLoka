// FloorballFlash for the plato and prevoz sheet (SPEC.md §5.3, §19.4): senior matches and the competition roster.
// Same unofficial GraphQL API and queries as the website (src/lib/ff.ts); keep them in step when one changes.

var FF_URL = "https://internal.floorballflash.at/";

var FF_MATCHES_QUERY =
  "query competitionDetailsTree($competitionId: Int!) {" +
  "  competitionDetails(competitionId: $competitionId) {" +
  "    id name teams { id name }" +
  "    phases { name groups { rounds { games {" +
  "      id state home { id } away { id }" +
  "      venue { name address { city } }" +
  "      schedule { date { year month day } time { hour min } timezone }" +
  "    } } } }" +
  "  }" +
  "}";

// The birth date is deliberately not asked for: we never need it and never store it.
var FF_PLAYERS_QUERY =
  "query competitionPlayers($filter: CompetitionPlayerFilter, $pagination: Pagination) {" +
  "  competitionPlayers(filter: $filter, pagination: $pagination) {" +
  "    person { id firstname lastname incognito }" +
  "  }" +
  "}";

function ffRequest(operationName, query, variables) {
  var response = UrlFetchApp.fetch(FF_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ operationName: operationName, query: query, variables: variables }),
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) throw new Error("FloorballFlash HTTP " + response.getResponseCode());
  var body = JSON.parse(response.getContentText());
  if (body.errors && body.errors.length) throw new Error(body.errors.map(function (e) { return e.message; }).join("; "));
  return body.data;
}

/** Offset of a time zone from UTC at an instant, in minutes (e.g. 120 for CEST), via Apps Script's Utilities. */
function offsetMinutes(utcMs, timeZone) {
  var z = Utilities.formatDate(new Date(utcMs), timeZone, "Z"); // "+0200"
  var sign = z.charAt(0) === "-" ? -1 : 1;
  return sign * (Number(z.substr(1, 2)) * 60 + Number(z.substr(3, 2)));
}

/** Wall-clock time in a time zone -> ISO 8601 with the offset of that day (same method as src/lib/ff.ts). */
function zonedIso(year, month, day, hour, minute, timeZone) {
  var wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  var guess = offsetMinutes(wallAsUtc, timeZone);
  var offset = offsetMinutes(wallAsUtc - guess * 60000, timeZone);
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var abs = Math.abs(offset);
  return year + "-" + pad(month) + "-" + pad(day) + "T" + pad(hour) + ":" + pad(minute) + ":00" +
    (offset >= 0 ? "+" : "-") + pad(Math.floor(abs / 60)) + ":" + pad(abs % 60);
}

/**
 * Matches of our teams in one competition. Playoff placeholders ("Winner Semi 1") and games without
 * a date or time are left out, as on the website (SPEC.md §5.5).
 * @returns {{matches: object[], teamIds: number[]}}
 */
function ffCompetition(competitionId, label, teamNames) {
  var details = ffRequest("competitionDetailsTree", FF_MATCHES_QUERY, { competitionId: competitionId }).competitionDetails;
  if (!details) throw new Error("tekmovanje " + competitionId + " ne obstaja");
  var names = {};
  details.teams.forEach(function (team) { names[team.id] = team.name; });
  var ours = details.teams.filter(function (team) { return teamNames.indexOf(team.name) !== -1; }).map(function (team) { return team.id; });
  if (ours.length === 0) throw new Error("ekipe " + teamNames.join(" / ") + " ni v tekmovanju " + competitionId);

  var matches = [];
  details.phases.forEach(function (phase) {
    phase.groups.forEach(function (group) {
      group.rounds.forEach(function (round) {
        round.games.forEach(function (game) {
          if (game.home.id === null || game.away.id === null) return;
          var s = game.schedule;
          if (!s || !s.date || !s.time) return;
          var home = ours.indexOf(game.home.id) !== -1;
          if (!home && ours.indexOf(game.away.id) === -1) return;
          var venue = game.venue ? [game.venue.name, game.venue.address && game.venue.address.city].filter(Boolean).join(", ") : "";
          matches.push({
            id: game.id,
            zacetek: zonedIso(s.date.year, s.date.month, s.date.day, s.time.hour, s.time.min, s.timezone || "Europe/Vienna"),
            tekmovanje: label,
            nasprotnik: names[home ? game.away.id : game.home.id] || "",
            doma: home,
            prizorisce: venue,
          });
        });
      });
    });
  });
  return { matches: matches, teamIds: ours };
}

/** Roster of one team in one competition: [{ffId, ime}]. Players marked incognito in FloorballFlash are left out. */
function ffPlayers(competitionId, teamId) {
  var list = ffRequest("competitionPlayers", FF_PLAYERS_QUERY, {
    filter: { competitionId: competitionId, teamId: teamId },
    pagination: { start: 0, limit: 200 },
  }).competitionPlayers;
  return list
    .filter(function (entry) { return !entry.person.incognito; })
    .map(function (entry) {
      return { ffId: entry.person.id, ime: cleanName([entry.person.firstname, entry.person.lastname].join(" ")) };
    })
    .filter(function (player) { return player.ime !== ""; });
}
