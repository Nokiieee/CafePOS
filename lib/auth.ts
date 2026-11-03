import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
