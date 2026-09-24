import { content } from "@/content";
import { Cta } from "./Cta";
import { ArrowIcon } from "./Icons";
import { WeftMark } from "./WeftMark";
import { Eyebrow } from "./Type";
import { Thread } from "./Thread";

/**
 * The page's full stop, then the one place to answer it.
 *
 * The statement stands on its own, centred, with nothing to click: a line the
 * page has earned does not need a button beside it, and a banner-with-button
 * here sat directly under the sticky header's identical one. The action lives
 * on the contact slab below, fired in the black glaze so the finale reads as
 * a different object from every porcelain tile above it.
 */
export function Closer() {
  const { closer, contact } = content;

  return (
    <section className="kami-section" id={contact.id}>
      <div className="kami-wrap">
        <div className="kami-finale">
          {/* The thread's last run ends in the knot. */}
          <Thread
            className="kami-finale__thread"
            d="M 44 0 C 44 50, 50 50, 50 100"
          />
          <span aria-hidden="true" className="kami-finale__mark">
            <WeftMark size={40} />
          </span>
          <p className="kami-display kami-display--finale">
            <span>{closer.lines[0]}</span>
            <br />
            <em>{closer.lines[1]}</em>
          </p>
        </div>

        <div className="kami-slab" data-cta-echo>
          <div className="kami-slab__say">
            <Eyebrow>{contact.eyebrow}</Eyebrow>
            <h2 className="kami-display kami-display--section">
              {contact.headline.map((line, index) => (
                <span key={line}>
                  {index > 0 ? <br /> : null}
                  {line}
                </span>
              ))}
            </h2>
            <p className="kami-body mt-6">{contact.body}</p>
            <Cta
              className="kami-cta--light kami-slab__cta"
              href={closer.cta.href}
              label={closer.cta.label}
            />
          </div>

          <ul className="kami-slab__links">
            {contact.links.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  rel={link.external ? "noreferrer noopener" : undefined}
                  target={link.external ? "_blank" : undefined}
                >
                  <span className="kami-slab__label">{link.label}</span>
                  <span className="kami-slab__value">{link.value}</span>
                  <span aria-hidden="true" className="kami-slab__go">
                    <ArrowIcon />
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <p className="kami-slab__pricing">{contact.pricing}</p>
        </div>
      </div>
    </section>
  );
}
