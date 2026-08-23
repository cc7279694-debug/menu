const PUBLIC_PATHS = new Set(["/login"]);

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

export function buildLoginRedirect(requestUrl: URL): URL {
  const redirectUrl = new URL("/login", requestUrl);
  redirectUrl.searchParams.set(
    "next",
    `${requestUrl.pathname}${requestUrl.search}`,
  );
  return redirectUrl;
}
