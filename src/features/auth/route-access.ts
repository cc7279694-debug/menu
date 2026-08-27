const PUBLIC_PATHS = new Set(["/login"]);

const PWA_PUBLIC_RESOURCE_PATHS = [
  "/sw.js",
  "/manifest.webmanifest",
  "/offline.html",
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

export function isPwaPublicResource(pathname: string): boolean {
  return (
    PWA_PUBLIC_RESOURCE_PATHS.includes(
      pathname as (typeof PWA_PUBLIC_RESOURCE_PATHS)[number],
    ) || pathname.startsWith("/icons/")
  );
}

export function buildLoginRedirect(requestUrl: URL): URL {
  const redirectUrl = new URL("/login", requestUrl);
  redirectUrl.searchParams.set(
    "next",
    `${requestUrl.pathname}${requestUrl.search}`,
  );
  return redirectUrl;
}
