import { Suspense } from "react";
import { PiCashRegister, PiCashRegisterFill, PiReceipt, PiReceiptFill } from "react-icons/pi";
import { Rail, RailLink } from "./rail";
import { SummaryLink, SummaryRailLink } from "./summary-link";

type PageRailProps = {
  /** The page being shown. Its tile at the bottom is filled. */
  current: "orders" | "summary";
};

// The rail for pages other than the cashier screen (Orders, Summary).
// Register (back to the cashier screen) sits where the categories usually
// are, and the page links stay at the bottom.
export function PageRail({ current }: PageRailProps) {
  return (
    <Rail
      footer={
        <>
          <RailLink
            href="/dashboard/orders"
            label="Orders"
            icon={PiReceipt}
            activeIcon={PiReceiptFill}
            isCurrent={current === "orders"}
          />
          {current === "summary" ? (
            // Only admins get this far (the page checks), so no role check here.
            <SummaryRailLink isCurrent />
          ) : (
            <Suspense fallback={null}>
              <SummaryLink />
            </Suspense>
          )}
        </>
      }
    >
      <RailLink
        href="/dashboard"
        label="Register"
        icon={PiCashRegister}
        activeIcon={PiCashRegisterFill}
      />
    </Rail>
  );
}
