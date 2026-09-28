// Hidden team pages /ekipa/plato and /ekipa/prevoz (SPEC.md §19.5).
// appsScriptUrl: the URL of the deployed Apps Script web app (apps-script/ekipa/README.md, step 6). It is not a
// secret: without the team code the web app returns nothing. Until it is set, the pages say they are not connected.
// PUBLIC_EKIPA_URL overrides it at build time; the browser tests use that to point the pages at a mock.
export const EKIPA = {
  appsScriptUrl: (import.meta.env.PUBLIC_EKIPA_URL as string | undefined) || "https://script.google.com/macros/s/AKfycbyLj4hADzQ-Iaigv-k42KisYiY2p6gdLiM6eJ8-kqjEf37SHDQO1qvkuCLDWplph6aTxg/exec",
};
