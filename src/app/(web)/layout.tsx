import React from "react";

import WebLayout from "@/web/components/WebLayout";
import "@/web/index.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <WebLayout>{children}</WebLayout>;
}
