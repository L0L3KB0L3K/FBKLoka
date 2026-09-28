// Tests for news order and the home page rule (SPEC.md §7.1).
import assert from "node:assert/strict";
import { test } from "node:test";
import { homeNews, newestFirst } from "../src/lib/news.ts";

const post = (id: string, day: string) => ({ id, data: { datum: new Date(`${day}T00:00:00Z`) } });

test("newest first, same day ordered by id, input untouched", () => {
  const posts = [post("a", "2026-04-11"), post("c", "2026-09-24"), post("b", "2026-04-12"), post("d", "2026-04-12")];
  assert.deepEqual(
    newestFirst(posts).map((p) => p.id),
    ["c", "d", "b", "a"],
  );
  assert.equal(posts[0]?.id, "a");
});

test("home page shows nothing below 3 posts, then the 3 newest", () => {
  assert.deepEqual(homeNews([post("a", "2026-01-01"), post("b", "2026-01-02")]), []);
  const four = [post("a", "2026-01-01"), post("b", "2026-01-02"), post("c", "2026-01-03"), post("d", "2026-01-04")];
  assert.deepEqual(
    homeNews(four).map((p) => p.id),
    ["d", "c", "b"],
  );
});
