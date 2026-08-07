"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { content } from "@/content";

function RollingNavLabel({ label }: { label: string }) {
  return (
    <span aria-hidden="true" className="nav-roll-window">
      <span className="nav-roll-track">
        <span>{label}</span>
        <span>{label}</span>
      </span>
    </span>
  );
}

export function Nav() {
  const reduce = Boolean(useReducedMotion());
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = content.nav.links
      .map((link) => document.querySelector(link.href))
      .filter((section): section is Element => Boolean(section));

    const observer = new IntersectionObserver(
      (entries) => {
        const active = entries.find((entry) => entry.isIntersecting);
        if (active?.target.id) setActiveHref(`#${active.target.id}`);
      },
      { rootMargin: "-20% 0px -65%", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <header className="nav-premium-wrap">
      <nav
        aria-label="Primary navigation"
        className="nav-premium-shell"
        data-scrolled={scrolled}
      >
        <a aria-label="Weft home" className="nav-brand" href="#main-content">
          <img alt="" className="nav-brand-mark" height={38} src="/icon.svg" width={38} />
          <span className="font-display">weft</span>
        </a>

        <div className="nav-desktop-links">
          {content.nav.links.map((link) => {
            const active = activeHref === link.href;
            return (
              <a
                aria-current={active ? "location" : undefined}
                aria-label={link.label}
                className="nav-link"
                data-active={active}
                href={link.href}
                key={link.href}
              >
                <RollingNavLabel label={link.label} />
              </a>
            );
          })}
        </div>

        <div className="nav-actions">
          <a className="nav-cta" href="#contact">
            {content.nav.cta}
          </a>
          <button
            aria-controls="mobile-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            className="nav-menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <span />
            <span />
          </button>
        </div>
      </nav>

      <AnimatePresence initial={false}>
        {menuOpen ? (
          <motion.div
            animate={{ opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }}
            className="nav-mobile-panel"
            exit={{ opacity: 0, transform: "translate3d(0, -6px, 0) scale(.98)" }}
            id="mobile-navigation"
            initial={
              reduce
                ? false
                : { opacity: 0, transform: "translate3d(0, -6px, 0) scale(.98)" }
            }
            transition={{ duration: reduce ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            {content.nav.links.map((link, index) => (
              <a
                href={link.href}
                key={link.href}
                onClick={() => setMenuOpen(false)}
              >
                <span className="font-mono text-[10px] text-ink/35">
                  0{index + 1}
                </span>
                <span>{link.label}</span>
              </a>
            ))}
            <a className="nav-mobile-cta" href="#contact" onClick={() => setMenuOpen(false)}>
              {content.nav.cta}
            </a>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
