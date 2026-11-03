import { createServerClient } from "@supabase/ssr";
import { io } from "next/cache";
import { cookies } from "next/headers";

// Create a new client for every request. Never share one between users.
export async function createClient() {
  const cookieStore = await cookies();

  // Supabase reads the current time (Date.now()) to check if the session
  // has expired. With Cache Components, that's only allowed after io(),
  // which keeps this code out of prerendering.
  await io();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components can't set cookies. That's fine:
            // proxy.ts refreshes the session cookie on every request.
          }
        },
      },
    },
  );
}
