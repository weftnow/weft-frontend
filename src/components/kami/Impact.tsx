import { content } from "@/content";
import { Cta } from "./Cta";
import { HandArrow } from "./Icons";
import { Eyebrow, Hand, Headline } from "./Type";
import { Thread } from "./Thread";

/**
 * The product shot, built in markup.
 *
 * A screenshot would go stale the first time the real dashboard moves, and it
 * would be a blank rectangle to anyone using a screen reader. The figures are
 * illustrative and the caption says so in the DOM, not just in a design file:
 * these are not customer results and must never be presented as any.
 */
function Dashboard() {
  const { dashboard } = content.impact;

  return (
    <figure className="kami-dash">
      <div aria-hidden="true" className="kami-dash__rail">
        <p className="kami-dash__brand">{dashboard.brand}</p>
        {dashboard.nav.map((item) => (
          <p
            className="kami-dash__navitem"
            data-active={item === dashboard.activeNav}
            key={item}
          >
            <span className="kami-dash__swatch" />
            {item}
          </p>
        ))}
      </div>

      <div className="kami-dash__body">
        <div className="kami-dash__stats">
          {dashboard.stats.map((stat) => (
            <div key={stat.label}>
              <p className="kami-dash__stat-label">{stat.label}</p>
              <p className="kami-dash__stat-value">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="kami-dash__panel">
          <div className="kami-dash__panel-head">
            <span className="kami-dash__stat-label">
              {dashboard.chart.title}
            </span>
            <span className="kami-dash__delta">{dashboard.chart.delta}</span>
          </div>
          <svg
            aria-hidden="true"
            className="kami-dash__chart"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 300 60"
          >
            <path
              d="M0 46 L37 38 L75 44 L112 24 L150 33 L187 18 L225 26 L262 12 L300 8"
              stroke="var(--kami-accent)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        <div className="kami-dash__grid">
          {dashboard.breakdowns.map((group) => (
            <div key={group.title}>
              <p className="kami-dash__stat-label">{group.title}</p>
              {group.rows.map((row) => (
                <p className="kami-dash__row" key={row.label}>
                  <span aria-hidden="true" className="kami-dash__swatch" />
                  {row.label}
                  <b>{row.value}</b>
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>

      <figcaption className="sr-only">{dashboard.caption}</figcaption>
    </figure>
  );
}

/**
 * Centred and staged, like the hero: the dashboard is this section's
 * character, so it gets the full width and a plinth to stand on rather than
 * half a row beside the copy.
 */
export function Impact() {
  const { impact } = content;

  return (
    <section className="kami-section" id={impact.id}>
      <div className="kami-wrap kami-proof">
        <div className="kami-proof__say">
          <Eyebrow>{impact.eyebrow}</Eyebrow>
          <Headline lines={impact.headline} />
          <p className="kami-body mt-6">{impact.body}</p>

          <div className="kami-proof__actions" data-cta-echo>
            <Cta href={impact.cta.href} label={impact.cta.label} />
            <a className="kami-textlink" href={impact.secondary.href}>
              {impact.secondary.label}
            </a>
          </div>
        </div>

        <div className="kami-proof__stage">
          <span aria-hidden="true" className="kami-proof__aside">
            <Hand>{impact.marginalia}</Hand>
            <HandArrow className="kami-proof__arrow" />
          </span>
          <Dashboard />
          <span aria-hidden="true" className="kami-proof__plinth" />
        </div>
      </div>

      {/* Runs in from the photo above and passes under the dashboard tile,
          over-and-under, the way a weft does. */}
      <Thread
        d="M 48.5 0 C 48.5 14, 12 16, 10 36 C 8 56, 18 68, 30 76"
        style={{ left: 0, right: 0, top: 0, height: "100%" }}
      />
    </section>
  );
}
