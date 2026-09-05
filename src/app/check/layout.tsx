import React from "react";
import { GutterWatermarks } from "@/components/GutterWatermarks";

// Segment layout for /check route.
// Persists the decorative side-gutter watermarks across all four steps (Intake, Results, Documents, Guidance)
// without remounting or flicker. Does not affect / or /_not-found.
export default function CheckLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GutterWatermarks />
      {children}
    </>
  );
}
