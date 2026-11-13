import { PiCashRegister, PiCashRegisterFill, PiReceipt, PiReceiptFill } from "react-icons/pi";
import { Rail, RailLink } from "@/components/pos/rail";

// The Orders page's rail. Register (back to the cashier screen) sits where
// the categories usually are, and Orders stays at the bottom, filled.
export function OrdersRail() {
  return (
    <Rail
      footer={
        <RailLink
          href="/dashboard/orders"
          label="Orders"
          icon={PiReceipt}
          activeIcon={PiReceiptFill}
          isCurrent
        />
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
