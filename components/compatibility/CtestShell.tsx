import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The furniture every compatibility screen sits in: the bone backdrop, the two
 * ambient blooms, and the way back to the site. Shared so the quiz, the
 * notices and the pair result cannot drift apart.
 *
 * Deliberately not a client component -- the two new pages render it on the
 * server, and a client component importing it is the direction React allows.
 */
export function CtestShell({
  children,
  /** Set on screens that scroll: centring a tall page hides its own opening. */
  align = "center",
}: {
  children: ReactNode;
  align?: "center" | "top";
}) {
  return (
    <div className={`ctest-shell${align === "top" ? " ctest-shell--top" : ""}`}>
      <span aria-hidden className="ctest-ambient ctest-ambient--ember" />
      <span aria-hidden className="ctest-ambient ctest-ambient--signal" />
      <Link className="ctest-home" href="/">
        <span aria-hidden>&larr;</span> Weft
      </Link>
      {children}
    </div>
  );
}
