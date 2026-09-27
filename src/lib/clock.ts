// Current time for browser scripts. In `npm run dev` the time can be faked for testing
// with ?now=2026-10-10T12:00 (SPEC.md §15, step 5). Production builds always use the real time.
export function currentTime(): Date {
  if (import.meta.env.DEV) {
    const fake = new URLSearchParams(location.search).get("now");
    if (fake && !Number.isNaN(Date.parse(fake))) return new Date(fake);
  }
  return new Date();
}
