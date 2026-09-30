// News order and the home page rule (SPEC.md §7.1, §7.8). Pure functions, tested in tests/news.test.ts.

interface Dated {
  id: string;
  data: { datum: Date };
}

/** Posts that are not drafts (osnutek: true in Decap); only these are on the site. */
export function published<T extends { data: { osnutek?: boolean } }>(posts: readonly T[]): T[] {
  return posts.filter((post) => !post.data.osnutek);
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
