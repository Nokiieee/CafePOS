import { Suspense } from "react";
import { PiCoffeeBeanFill, PiWarningCircleFill } from "react-icons/pi";
import { login } from "@/actions/auth";

const inputClass =
  "h-12 rounded-2xl border border-roast-400 bg-white px-4 text-espresso-950 caret-espresso-700 outline-none transition-colors duration-200 hover:border-espresso-600 focus:border-espresso-700 focus:ring-2 focus:ring-espresso-700/20";

export default function LoginPage({ searchParams }: PageProps<"/">) {
  return (
    <main className="flex flex-1 flex-col bg-latte-100 text-espresso-950">
      <header className="flex items-center gap-3 px-6 py-5 sm:px-8">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-latte-200 text-espresso-800">
          <PiCoffeeBeanFill aria-hidden className="size-6" />
        </div>
        <span className="text-2xl font-semibold tracking-tight text-espresso-900">
          Cafe POS
        </span>
      </header>

      {/* pb-20 offsets the header's height so the panel sits in the true middle. */}
      <div className="flex flex-1 items-center justify-center px-4 pt-4 pb-20">
        <form
          action={login}
          className="flex w-full max-w-sm flex-col gap-6 rounded-3xl bg-milk p-8 ring-1 ring-latte-200 sm:p-10"
        >
          <h1 className="text-center text-2xl font-semibold tracking-tight">
            Sign in
          </h1>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-espresso-900"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-espresso-900"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={inputClass}
              />
            </div>
          </div>

          <Suspense>
            <ErrorMessage searchParams={searchParams} />
          </Suspense>

          <button
            type="submit"
            className="h-12 rounded-2xl bg-espresso-700 font-semibold text-milk transition-colors duration-200 outline-none hover:bg-espresso-800 focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-offset-2 focus-visible:ring-offset-milk active:bg-espresso-900"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}

// Shows the error from the URL (/?message=...) after a failed sign-in.
async function ErrorMessage({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const { message } = await searchParams;
  if (typeof message !== "string") return null;

  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <PiWarningCircleFill aria-hidden className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}
