import { content } from "@/content";
import { Asset } from "./Asset";
import { HandArrow, JoinIcon } from "./Icons";
import { Eyebrow, Hand, Headline } from "./Type";
import { Thread } from "./Thread";

/** Initials, so the badge never needs two more portrait files to be true. */
function initial(name: string) {
  return name.slice(0, 1).toUpperCase();
}

/**
 * The page turns round here. Every section above leads with the argument;
 * this one leads with the room, at the photo's own portrait height, and lets
 * the copy settle at its foot. The introduction badge sits across the seam
 * between the two, because it is the thing that joins them.
 */
export function RealPicture() {
  const { real } = content;

  return (
    <section className="kami-section" id={real.id}>
      <div className="kami-wrap kami-real">
        <div className="kami-real__photo">
          <div className="kami-scene">
            <Asset
              asset={real.scene}
              sizes="(min-width: 900px) 30rem, 92vw"
            />
            <span aria-hidden="true" className="kami-scene__mark">
              {real.mark}
            </span>
          </div>

          <figure className="kami-scene__badge">
            <figcaption className="kami-scene__badge-label">
              {real.badge.label}
            </figcaption>
            <div className="kami-scene__pair">
              <span aria-hidden="true" className="kami-scene__dot">
                {initial(real.badge.left)}
              </span>
              {real.badge.left}
              <span className="kami-scene__link">
                <JoinIcon />
              </span>
              <span aria-hidden="true" className="kami-scene__dot">
                {initial(real.badge.right)}
              </span>
              {real.badge.right}
            </div>
          </figure>
        </div>

        <div className="kami-real__say">
          <span aria-hidden="true" className="kami-real__aside">
            <HandArrow className="kami-real__arrow" />
            <Hand tilt="right">{real.marginalia}</Hand>
          </span>
          <Eyebrow>{real.eyebrow}</Eyebrow>
          <Headline className="kami-display--large" lines={real.headline} />
          <p className="kami-body mt-6">{real.body}</p>
        </div>
      </div>

      {/* Straight down the seam between photo and copy, and under the badge
          that sits across it. */}
      <Thread
        d="M 50 0 C 50 12, 48.5 20, 48.5 36 L 48.5 100"
        style={{ left: 0, right: 0, top: 0, height: "100%" }}
      />
    </section>
  );
}
