import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  buildLoginRedirect,
  isPublicPath,
} from "@/features/auth/route-access";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

function copySessionCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const env = getPublicEnv();
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (!user && !isPublicPath(pathname)) {
    return copySessionCookies(
      response,
      NextResponse.redirect(buildLoginRedirect(request.nextUrl)),
    );
  }

  if (user && pathname === "/login") {
    return copySessionCookies(
      response,
      NextResponse.redirect(new URL("/recipes", request.url)),
    );
  }

  return response;
}
