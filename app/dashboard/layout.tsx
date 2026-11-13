import { BillProvider } from "@/components/pos/bill-provider";

// Wraps every page under /dashboard (the cashier screen and Orders).
// The bill lives here, so moving between those pages doesn't lose it.
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return <BillProvider>{children}</BillProvider>;
}
