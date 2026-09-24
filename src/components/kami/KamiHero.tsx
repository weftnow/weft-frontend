import { content } from "@/content";
import { Asset } from "./Asset";
import { Cta, GhostCta } from "./Cta";
import { HandArrow } from "./Icons";
import { Eyebrow, Hand } from "./Type";
import { Thread } from "./Thread";

export function KamiHero() {
  const { hero } = content;

  return (
    <section className="kami-section kami-hero">
      <span aria-hidden="true" className="kami-hero__arc kami-hero__arc--left" />
      <span aria-hidden="true" className="kami-hero__arc kami-hero__arc--right" />

      <div className="kami-wrap">
        <Eyebrow>{hero.eyebrow}</Eyebrow>

        <h1 className="kami-display kami-display--hero">{hero.headline}</h1>

        <p className="kami-lede mt-5">{hero.sub}</p>
        <p className="kami-note mt-4">{hero.note}</p>

        <div className="kami-hero__actions">
          <Cta href={hero.ctaPrimary.href} label={hero.ctaPrimary.label} />
          <GhostCta
            href={hero.ctaSecondary.href}
            label={hero.ctaSecondary.label}
          />
        </div>

        <div className="kami-hero__stage">
          <span className="kami-hero__aside">
            <Hand>{hero.marginalia}</Hand>
            <HandArrow className="kami-hero__arrow" />
          </span>

          <div className="kami-hero__figure">
            <Asset
              asset={hero.kami}
              className="kami-hero__kami"
              priority
              sizes="(min-width: 768px) 17rem, 45vw"
            />
            <span aria-hidden="true" className="kami-hero__podium" />
          </div>

          <div className="kami-hero__bubble">
            <span aria-hidden="true" className="kami-wave">
              <span style={{ animationDelay: "0ms" }} />
              <span style={{ animationDelay: "120ms" }} />
              <span style={{ animationDelay: "240ms" }} />
              <span style={{ animationDelay: "80ms" }} />
              <span style={{ animationDelay: "200ms" }} />
            </span>
            <p className="kami-hero__bubble-title">{hero.bubble.title}</p>
            <p className="kami-hero__bubble-body">{hero.bubble.body}</p>
          </div>
        </div>
      </div>

      {/* Leaves the podium, swings right, and drops into the challenge. */}
      <Thread
        d="M 50 4 C 60 20, 74 30, 72 56 C 70 80, 60 90, 58 100"
        style={{ left: 0, right: 0, top: "62%", height: "38%" }}
      />
    </section>
  );
}
