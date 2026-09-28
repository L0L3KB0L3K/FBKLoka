// News order and the home page rule (SPEC.md §7.1, §7.8). Pure functions, tested in tests/news.test.ts.

interface Dated {
  id: string;
  data: { datum: Date };
}

/** Posts on the home page. */
export const HOME_NEWS = 3;

/** Newest first. Same day: by id (file name), so the order does not change between builds. */
export function newestFirst<T extends Dated>(posts: readonly T[]): T[] {
  return [...posts].sort((a, b) => b.data.datum.getTime() - a.data.datum.getTime() || b.id.localeCompare(a.id));
}

/** The 3 newest posts, or none while there are fewer than 3: the section stays hidden (SPEC.md §7.1). */
export function homeNews<T extends Dated>(posts: readonly T[]): T[] {
  return posts.length < HOME_NEWS ? [] : newestFirst(posts).slice(0, HOME_NEWS);
}
