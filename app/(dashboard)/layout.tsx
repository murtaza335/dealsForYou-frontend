import { SharedLayout } from "@/components/shared-layout";
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <SharedLayout>{children}</SharedLayout>;
}
