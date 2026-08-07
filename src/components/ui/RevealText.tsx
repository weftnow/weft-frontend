"use client";

import { SectionHeading } from "./SectionHeading";

type Line = { readonly text: string; readonly muted: string };

/** @deprecated Use SectionHeading for new section-level headings. */
export function RevealText({
  lines,
  className = "",
  as = "h2",
}: {
  lines: readonly Line[];
  className?: string;
  as?: "h1" | "h2" | "p";
}) {
  return <SectionHeading as={as} className={className} lines={lines} />;
}
