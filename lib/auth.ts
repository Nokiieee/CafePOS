import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// getCurrentUser and getRole are wrapped in React's cache(): during one page
// load, the first call asks Supabase and every later call gets the same
// answer. A page can then ask in several places (the account button, the
// admin rail tile, the page itself) without asking Supabase several times.
// Each new request starts fresh, so a changed role shows on the next load.

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
export const getCurrentUser = cache(async () => {
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
});

/** What a staff account can do. Set per account in the profiles table. */
export type Role = "admin" | "cashier";

// The user's role, from the profiles table (supabase/profiles.sql).
// Only a clear "admin" counts as admin. A missing row, a database error or an
// unknown value all mean cashier, so nobody becomes admin by accident.
export function getRole(user: User): Promise<Role> {
  // Remembered by the user's id (text), which matches on every call.
  return getRoleById(user.id);
}

const getRoleById = cache(async (userId: string): Promise<Role> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    // One row or none (none: no error, data is null).
    .maybeSingle()
    // Supabase doesn't know our tables' types, so tell it what comes back.
    .overrideTypes<{ role: string }, { merge: false }>();

  if (error) {
    console.error("Loading the role failed:", error.message);
  }

  return data?.role === "admin" ? "admin" : "cashier";
});

// For admin-only pages and actions. Returns the signed-in admin; signed-out
// visitors go to the login page and cashiers go back to the register.
export async function requireAdmin() {
  const user = await getCurrentUser();

  if ((await getRole(user)) !== "admin") {
    redirect("/dashboard");
  }

  return user;
}
