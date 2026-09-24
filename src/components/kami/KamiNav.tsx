"use client";

import { useEffect, useState } from "react";
import { content } from "@/content";
import { Cta } from "./Cta";
import { WeftLockup } from "./WeftMark";

/**
 * The header. Rides transparently over the hero's light wash and only takes a
 * surface once the page has scrolled, so the first viewport stays one image
 * rather than a bar sitting on top of one.
 */
export function KamiNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [echoed, setEchoed] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The header's action steps aside while the page is showing one of its own
  // (`data-cta-echo`): two identical buttons stacked on the same right-hand
  // edge read as a glitch, not as emphasis.
  useEffect(() => {
    const targets = document.querySelectorAll("[data-cta-echo]");
    if (targets.length === 0) return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      setEchoed(visible.size > 0);
    });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <header className="kami-nav" data-scrolled={scrolled}>
      <div className="kami-nav__inner">
        <a aria-label="Weft home" className="kami-nav__brand" href="#main-content">
          <WeftLockup size={28} />
        </a>

        <nav aria-label="Primary" className="kami-nav__links">
          {content.nav.links.map((link) => (
            <a href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="kami-nav__actions">
          <a className="kami-nav__signin" href={content.nav.signIn.href}>
            {content.nav.signIn.label}
          </a>
          <Cta
            aria-hidden={echoed || undefined}
            className="kami-nav__cta"
            data-echoed={echoed}
            tabIndex={echoed ? -1 : undefined}
            href={content.nav.cta.href}
            label={content.nav.cta.label}
          />
          <button
            aria-controls="kami-mobile-nav"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="kami-nav__toggle"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            <span data-open={open} />
            <span data-open={open} />
          </button>
        </div>
      </div>

      {open ? (
        <div className="kami-nav__panel" id="kami-mobile-nav">
          {content.nav.links.map((link) => (
            <a href={link.href} key={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <a
            href={content.nav.signIn.href}
            onClick={() => setOpen(false)}
          >
            {content.nav.signIn.label}
          </a>
          <Cta href={content.nav.cta.href} label={content.nav.cta.label} />
        </div>
      ) : null}
    </header>
  );
}
