import Image from "next/image";
import Link from "next/link";
import { CalendarIcon, LogOutIcon } from "./icons";
import styles from "./Dashboard.module.css";

/**
 * The chrome every authenticated organizer screen sits inside: a navigation
 * rail on the page itself, and the work in a raised panel beside it.
 *
 * Not a route layout. `/organizer` also owns login and register, and those two
 * are their own full-bleed screens with no navigation to offer — wrapping the
 * whole segment would put a "Log out" button in front of someone who has not
 * logged in. Composing the shell from each authenticated page keeps the two
 * kinds of screen honestly separate.
 *
 * `active` is a prop rather than a `usePathname()` read, for the same reason
 * TabBar takes one: a server component that needs the router has to become a
 * client component, and the caller always knows which page it is.
 */
export function DashboardShell({
  active = "events",
  children,
}: {
  active?: "events";
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <div className={styles.sidebar}>
        <Link className={styles.brand} href="/">
          <Image
            alt=""
            aria-hidden
            className={styles.brandMark}
            height={28}
            src="/icon.svg"
            width={28}
          />
          weft
        </Link>

        <nav aria-label="Dashboard" className={styles.navGroup}>
          <p className={styles.navLabel}>Main</p>
          <Link
            aria-current={active === "events" ? "page" : undefined}
            className={styles.navItem}
            href="/organizer"
          >
            <CalendarIcon />
            Events
          </Link>
        </nav>

        <div className={styles.sidebarFoot}>
          {/*
            A real form POST, not a fetch: signing out is the one control that
            still has to work when the JavaScript has not loaded or has thrown.
          */}
          <form action="/api/organizer-auth/logout" className={styles.logoutForm} method="post">
            <button className={`${styles.navItem} ${styles.logout}`} type="submit">
              <LogOutIcon />
              Log out
            </button>
          </form>
        </div>
      </div>

      <main className={styles.panel}>{children}</main>
    </div>
  );
}
