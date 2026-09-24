import { content } from "@/content";
import { Asset } from "./Asset";
import { Eyebrow, Hand, Headline } from "./Type";
import { Thread } from "./Thread";

/**
 * The room, seen from above.
 *
 * The argument stands in the middle and the guests are spread around it at
 * different distances, the way people actually hold a floor. Between them run
 * threads that reach for each other and stop short: the introductions the
 * section says are missing. On a phone the orbit collapses into a plain grid
 * under the copy, and the near-misses go with it.
 */
export function Challenge() {
  const { challenge } = content;

  return (
    <section className="kami-section" id={challenge.id}>
      <div className="kami-wrap kami-room">
        {/* Three pairs, each drawn as two arcs that stop before they meet. */}
        <svg
          aria-hidden="true"
          className="kami-room__misses"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <path d="M 13 22 C 22 6, 36 2, 44 4" />
          <path d="M 56 3 C 66 2, 78 6, 86 16" />
          <path d="M 18 70 C 22 90, 34 97, 42 97" />
          <path d="M 58 97 C 68 97, 80 92, 84 78" />
          <path d="M 10 46 C 8 52, 8 56, 10 60" />
          <path d="M 91 38 C 94 44, 94 50, 91 56" />
        </svg>

        <div className="kami-room__say">
          <Eyebrow>{challenge.eyebrow}</Eyebrow>
          <Headline lines={challenge.headline} />
          <p className="kami-body mt-6">{challenge.body}</p>
          <Hand className="kami-room__aside" tilt="right">
            {challenge.marginalia}
          </Hand>
        </div>

        <ul className="kami-room__people">
          {challenge.people.map((person) => (
            <li className="kami-person" key={person.role}>
              <span
                className="kami-person__frame"
                style={{ "--kami-focus": person.focus } as React.CSSProperties}
              >
                <Asset
                  asset={person.asset}
                  sizes="(min-width: 900px) 8rem, 28vw"
                />
              </span>
              <span className="kami-person__role">{person.role}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Drops in from the hero and walks the outside of the room rather than
          through it, then comes back to the centre for the journey below. */}
      <Thread
        d="M 58 0 C 58 8, 94 6, 95 26 C 96 52, 95 76, 80 90 C 70 98, 54 94, 50 100"
        style={{ left: 0, right: 0, top: 0, height: "100%" }}
      />
    </section>
  );
}
