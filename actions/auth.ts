"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  // The browser's `required` check can be skipped, so check again here.
  if (typeof email !== "string" || !email.trim()) {
    backToLogin("Please enter your email.");
  }
  if (typeof password !== "string" || !password) {
    backToLogin("Please enter your password.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    backToLogin(error.message);
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  // "local" ends only this device's session (Supabase forgets it and the
  // cookies are deleted). Other devices on the same account stay signed in.
  // The default, "global", would sign the account out everywhere.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}

// `never` tells TypeScript this function always stops (redirect throws),
// so after the checks above it knows email and password are strings.
function backToLogin(message: string): never {
  redirect(`/?message=${encodeURIComponent(message)}`);
}
