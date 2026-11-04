import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// The name to show for a user: their display name from Supabase if one is set,
// otherwise their email.
export function getDisplayName(user: User): string {
  const metadata = user.user_metadata ?? {};

  for (const key of ["display_name", "full_name", "name"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return user.email ?? "Unknown user";
}

// Returns the signed-in user, or sends the visitor to the login page.
// Call this in every page or action that needs a signed-in user.
export async function getCurrentUser() {
  const supabase = await createClient();

  // getUser() asks Supabase to verify the session. Don't use getSession()
  // here: it only reads the cookie, which could be faked.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return user;
}
