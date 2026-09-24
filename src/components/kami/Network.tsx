import { content } from "@/content";
import { Asset } from "./Asset";
import { Eyebrow, Hand, Headline } from "./Type";
import { Thread } from "./Thread";

/**
 * A rising line of cities.
 *
 * Each city stands a step higher than the last, and the thread climbs through
 * them: the section's claim, that every event makes the next one smarter,
 * drawn as the shape of the row. The headline takes the open corner the climb
 * leaves top left, the body the one it leaves bottom right. On a phone the
 * steps flatten into a plain two-up grid between the two.
 */
export function Network() {
  const { network } = content;

  return (
    <section className="kami-section" id={network.id}>
      <div className="kami-wrap kami-climb">
        <div className="kami-climb__head">
          <Eyebrow>{network.eyebrow}</Eyebrow>
          <Headline lines={network.headline} />
        </div>

        <div className="kami-climb__row">
          <Thread
            className="kami-climb__thread"
            d="M 0 100 L 100 0"
            reveal="right"
          />

          <ul className="kami-climb__cities">
            {network.cities.map((city) => (
              <li className="kami-city" key={city.name}>
                <span
                  className="kami-city__frame"
                  style={{ "--kami-focus": city.focus } as React.CSSProperties}
                >
                  <Asset
                    asset={city.asset}
                    sizes="(min-width: 900px) 15rem, 42vw"
                  />
                </span>
                <span className="kami-city__name">{city.name}</span>
                <span aria-hidden="true" className="kami-city__bead" />
              </li>
            ))}
          </ul>
        </div>

        <div className="kami-climb__foot">
          <p className="kami-body">{network.body}</p>
          <Hand className="kami-climb__aside">{network.marginalia}</Hand>
        </div>
      </div>
    </section>
  );
}
