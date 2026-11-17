import { Suspense } from "react";
import { PosScreen } from "@/components/pos/pos-screen";
import { SignedInAs, SignedInAsFallback } from "@/components/pos/signed-in-as";
import { SummaryLink } from "@/components/pos/summary-link";

export default function DashboardPage() {
  return (
    <PosScreen
      account={
        <Suspense fallback={<SignedInAsFallback />}>
          <SignedInAs />
        </Suspense>
      }
      adminLinks={
        <Suspense fallback={null}>
          <SummaryLink />
        </Suspense>
      }
    />
  );
}
