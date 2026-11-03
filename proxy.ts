import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Give the refreshed cookies to the page being rendered...
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          // ...and to the browser, so it saves them.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Stop CDNs from caching a response that contains someone's session.
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Checks the session and refreshes it if it has expired.
  // Don't put any code between createServerClient and this call.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;

  if (!isSignedIn && pathname.startsWith("/dashboard")) {
    return redirectTo(request, response, "/");
  }

  if (isSignedIn && pathname === "/") {
    return redirectTo(request, response, "/dashboard");
  }

  return response;
}

// Redirect, but keep any refreshed session cookies from `response`.
function redirectTo(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") redirect.headers.set(key, value);
  });
  return redirect;
}

export const config = {
  matcher: [
    // Run on every page, but skip Next.js internals and image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
