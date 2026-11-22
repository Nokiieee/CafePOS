"use client";

import { useFormStatus } from "react-dom";
import { PiSpinnerGap } from "react-icons/pi";

// The login form's Sign in button. The login page is drawn on the server, so
// this one button runs in the browser: useFormStatus() tells it whether the
// form it sits in is still being sent (it must be inside the <form>). It
// stays on "Signing in…" until the register has loaded, or until the
// "wrong password" message comes back.
export function SignInButton() {
  const { pending } = useFormStatus();

  return (
    // While signing in it's disabled, so a second tap or Enter can't send
    // the form twice, but it stays dark brown (no disabled look), so it reads
    // as "working on it" rather than "not allowed", like Saving… on Charge.
    <button
      type="submit"
      disabled={pending}
      className={`flex h-12 items-center justify-center gap-2 rounded-2xl bg-espresso-700 font-semibold text-milk transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-offset-2 focus-visible:ring-offset-milk ${
        pending ? "cursor-wait" : "hover:bg-espresso-800 active:bg-espresso-900"
      }`}
    >
      {pending ? (
        <>
          <PiSpinnerGap aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />
          Signing in…
        </>
      ) : (
        "Sign in"
      )}
    </button>
  );
}
