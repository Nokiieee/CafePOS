import { Suspense } from "react";
import { logout } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export default function DashboardPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>

        <Suspense
          fallback={<p className="text-zinc-500 dark:text-zinc-400">Loading…</p>}
        >
          <SignedInAs />
        </Suspense>

        <form action={logout}>
          <button
            type="submit"
            className="h-11 w-full rounded-lg border border-zinc-300 font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}

// Reads the session, so it must sit inside <Suspense> (Cache Components rule).
async function SignedInAs() {
  const user = await getCurrentUser();

  return (
    <p className="text-zinc-700 dark:text-zinc-300">
      You&apos;re signed in as{" "}
      <span className="font-medium text-zinc-900 dark:text-zinc-50">
        {user.email}
      </span>
    </p>
  );
}
