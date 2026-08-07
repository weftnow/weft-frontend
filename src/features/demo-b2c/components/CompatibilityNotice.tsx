import { CtestShell } from "@/features/demo-b2c/components/CtestShell";
import { PremiumButton } from "@/components/ui/PremiumButton";

/**
 * A dead end with an explanation: an expired invite, a link that never
 * existed, a backend having a moment.
 *
 * Deliberately not `notFound()`. A 410 and a 404 mean different things to the
 * person holding the link -- one can ask for a fresh one, the other should
 * check what they pasted -- and neither is served by a generic not-found page.
 * The HTTP status stays 200; the words are what carry the meaning here.
 */
export function CompatibilityNotice({
  eyebrow,
  headline,
  body,
  cta,
}: {
  eyebrow: string;
  headline: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <CtestShell>
      <div className="relative z-10 flex flex-col items-center text-center">
        <span className="ctest-eyebrow">{eyebrow}</span>
        <h1 className="ctest-prompt">{headline}</h1>
        <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-ink/60">
          {body}
        </p>
        {cta && (
          <div className="mt-8">
            <PremiumButton href={cta.href} tone="ember">
              {cta.label}
            </PremiumButton>
          </div>
        )}
      </div>
    </CtestShell>
  );
}
