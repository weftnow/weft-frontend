"use client";

import { content } from "@/content";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Contact() {
  const { contact, nav } = content;

  return (
    <footer
      id="contact"
      className="relative overflow-hidden bg-bone px-6 pt-28 md:px-10 md:pt-40"
    >
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <Eyebrow>{contact.eyebrow}</Eyebrow>
          <SectionHeading
            as="h2"
            lines={contact.headline}
            className="text-4xl text-ink md:text-5xl"
          />
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1.28fr)_minmax(280px,0.72fr)] lg:items-stretch">
          <div className="rounded-[2rem] bg-paper px-7 py-12 shadow-[var(--shadow-media)] sm:px-10 lg:px-14 lg:py-16 xl:px-16">
            <p className="max-w-md text-base leading-relaxed text-ink/62">{contact.body}</p>

            <form
              className="mt-10 grid gap-6"
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <ContactField
                autoComplete="name"
                id="contact-name"
                label={contact.fields.name}
                placeholder={contact.fields.name}
                required
                type="text"
              />
              <ContactField
                autoComplete="email"
                id="contact-email"
                label={contact.fields.email}
                placeholder={contact.fields.email}
                required
                type="email"
              />

              <div className="grid gap-2">
                <label className="text-sm font-medium text-ink" htmlFor="contact-event">
                  {contact.fields.event}
                </label>
                <textarea
                  className="min-h-32 w-full resize-y rounded-2xl border border-ink/14 bg-bone/50 px-5 py-4 text-base leading-relaxed text-ink outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-ink/32 focus:border-signal focus:bg-paper focus:shadow-[0_0_0_3px_rgba(0,144,222,0.14)]"
                  id="contact-event"
                  name="event"
                  placeholder={contact.fields.event}
                  rows={4}
                />
              </div>

              <div className="mt-2">
                <PremiumButton tone="ember" type="submit">
                  {contact.cta}
                </PremiumButton>
              </div>
            </form>
          </div>

          <aside aria-label="Contact details" className="grid content-start gap-4 lg:gap-5">
            {contact.links.map((item) => (
              <ContactLink item={item} key={item.label} />
            ))}
          </aside>
        </div>

        <div className="mt-16 grid gap-8 border-t border-ink/12 py-8 md:grid-cols-[1fr_auto] md:items-end">
          <div className="grid gap-5">
            <a aria-label="Weft home" className="inline-flex items-center gap-2" href="#main-content">
              <img alt="" className="footer-brand-mark" height={28} src="/icon.svg" width={28} />
              <span className="font-display text-sm font-bold text-ink">weft</span>
            </a>
            <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-3">
              {nav.links.map((link) => (
                <a
                  className="font-meta rounded-sm text-[10px] text-ink/62 transition-colors duration-200 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-signal"
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <span aria-disabled="true" className="font-meta text-[9px] text-ink/32">
                Privacy
              </span>
              <span aria-disabled="true" className="font-meta text-[9px] text-ink/32">
                Terms
              </span>
              <span className="font-meta text-[9px] text-ink/32">Routes coming soon</span>
            </div>
          </div>
          <p className="font-meta text-[9px] text-ink/42 md:text-right">
            {contact.copyright}
          </p>
        </div>
      </div>

      <div className="relative mx-auto mt-2 flex max-w-[100rem] justify-center overflow-hidden pt-10">
        <span className="font-display relative block select-none text-[24vw] font-bold leading-[0.72] text-ink/[0.07]">
          {contact.wordmark}
        </span>
      </div>
    </footer>
  );
}

function ContactLink({
  item,
}: {
  item: (typeof content.contact.links)[number];
}) {
  return (
    <a
      aria-label={item.label}
      className="group grid min-h-28 grid-cols-[3.25rem_1fr_auto] items-center gap-4 rounded-[1.75rem] bg-paper px-6 py-5 text-ink shadow-[var(--shadow-media)] transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-white focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-signal sm:px-7"
      href={item.href}
      rel={item.external ? "noreferrer" : undefined}
      target={item.external ? "_blank" : undefined}
    >
      <span
        aria-hidden="true"
        className="grid h-11 w-11 place-items-center rounded-full bg-ink text-sm font-bold tracking-[-0.08em] text-paper"
      >
        {item.mark}
      </span>
      <span className="grid gap-1">
        <span className="font-meta text-[9px] text-ink/42">{item.label}</span>
        <span className="text-sm font-semibold text-ink sm:text-base">{item.value}</span>
      </span>
      <span aria-hidden="true" className="text-lg text-ink/35 transition-transform duration-200 group-hover:translate-x-0.5">
        ↗
      </span>
    </a>
  );
}

function ContactField({
  autoComplete,
  id,
  label,
  placeholder,
  required,
  type,
}: {
  autoComplete: string;
  id: string;
  label: string;
  placeholder: string;
  required?: boolean;
  type: "email" | "text";
}) {
  return (
    <div className="grid gap-2">
      <label className="flex items-baseline justify-between gap-4 text-sm font-medium text-ink" htmlFor={id}>
        <span>{label}</span>
        {required ? <span className="font-meta text-[9px] text-ink/38">Required</span> : null}
      </label>
      <input
        autoComplete={autoComplete}
        className="min-h-14 w-full rounded-2xl border border-ink/14 bg-bone/50 px-5 py-4 text-base text-ink outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-ink/32 focus:border-signal focus:bg-paper focus:shadow-[0_0_0_3px_rgba(0,144,222,0.14)]"
        id={id}
        name={id.replace("contact-", "")}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </div>
  );
}
