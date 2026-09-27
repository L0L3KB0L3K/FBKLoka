// getCollection() read once per build. Pages share the result, and Astro's warning for an empty
// collection ("does not exist or is empty") is printed once per collection instead of once per page.
// In `npm run dev` there is no cache, so content edits show up at once.
import { getCollection, type CollectionEntry, type CollectionKey } from "astro:content";

const cache = new Map<CollectionKey, Promise<unknown>>();

export function loadCollection<C extends CollectionKey>(name: C): Promise<CollectionEntry<C>[]> {
  if (import.meta.env.DEV) return getCollection(name);
  if (!cache.has(name)) cache.set(name, getCollection(name));
  return cache.get(name) as Promise<CollectionEntry<C>[]>;
}
