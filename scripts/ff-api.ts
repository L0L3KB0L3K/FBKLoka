// Minimal client for the unofficial FloorballFlash GraphQL API (SPEC.md §5.1).
// Shared by fetch-ff.ts and scan-fbk-loka.ts. FF_API_URL can point elsewhere for tests.
export const FF_API_URL = process.env.FF_API_URL ?? "https://internal.floorballflash.at/";

type GraphQlResponse<T> = { data?: T; errors?: { message: string }[] };

/** Sends one GraphQL operation and returns its data. Throws on HTTP, GraphQL or timeout errors. */
export async function ffRequest<T>(operationName: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(FF_API_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operationName, query, variables }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = (await response.json()) as GraphQlResponse<T>;
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));
  if (!body.data) throw new Error("Empty response");
  return body.data;
}

/** Pause between calls, so we do not hammer an API we do not own (SPEC.md §5.5: 300 ms). */
export const pause = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
