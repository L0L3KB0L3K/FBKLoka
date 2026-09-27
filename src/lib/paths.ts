// Page path without the trailing slash, ".html" or "index", so the menu can compare a link
// ("/tekme/") with the current page ("/tekme/", "/tekme", "/tekme/index.html") the same way.
export function cleanPath(pathname: string): string {
  return pathname.replace(/(\/index)?\.html$/, "").replace(/\/+$/, "") || "/";
}
