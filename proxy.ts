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

  const { pathname } = request.nextUrl;

  // Checks the session and refreshes it if it has expired.
  // Don't put any code between createServerClient and these calls.
  const isSignedIn =
    pathname === "/" ? await isSessionAlive(supabase) : await hasValidToken(supabase);

  if (!isSignedIn && pathname.startsWith("/dashboard")) {
    return redirectTo(request, response, "/");
  }

  if (isSignedIn && pathname === "/") {
    return redirectTo(request, response, "/dashboard");
  }

  return response;
}

type SupabaseClient = ReturnType<typeof createServerClient>;

// The fast check, for every page but the login page: is the sign-in token in
// the cookies real and not expired? getClaims() checks its signature here,
// without asking Supabase, so it can't know if the session was ended
// elsewhere (Sign out signs out every device). The pages find out with
// getCurrentUser(), which asks Supabase, and send the visitor to "/".
async function hasValidToken(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase.auth.getClaims();
  return Boolean(data?.claims);
}

// The sure check, for the login page only: getUser() asks Supabase whether
// the session is still alive. With the fast check here, a session ended on
// another device bounced the browser between "/" and "/dashboard" until the
// token expired (up to an hour): the token still looked fine here, but
// Supabase told the page it was gone. When the session is gone, getUser()
// also deletes its cookies, which the proxy can do and a page can't. One
// extra trip to Supabase, only when the login page opens.
async function isSessionAlive(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  return Boolean(data.user);
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
