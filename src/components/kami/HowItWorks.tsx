import { content } from "@/content";
import { Asset } from "./Asset";
import {
  CallIcon,
  EndCallIcon,
  HandArrow,
  HostIcon,
  JoinIcon,
  MatchIcon,
  MoreIcon,
} from "./Icons";
import { Eyebrow, Hand, Headline } from "./Type";
import { Thread } from "./Thread";

const icons = {
  call: CallIcon,
  match: MatchIcon,
  host: HostIcon,
} as const;

/**
 * Step 01 happening: the live call.
 *
 * Built in markup rather than dropped in as a screenshot: it carries a real
 * name and role, and a picture of an interface cannot be read by anyone using
 * a screen reader, nor restyled when the brand moves.
 */
function CallScene() {
  const { call } = content.how;

  return (
    <figure className="kami-call">
      <div className="kami-call__avatar">
        <Asset asset={call.avatar} sizes="4rem" />
      </div>
      <figcaption>
        <p className="kami-call__name">{call.status}</p>
        <p className="kami-call__role">{call.role}</p>
      </figcaption>
      <div aria-hidden="true" className="kami-call__controls">
        <span className="kami-call__key">
          <MatchIcon size={14} />
        </span>
        <span className="kami-call__key kami-call__key--end">
          <EndCallIcon size={16} />
        </span>
        <span className="kami-call__key">
          <MoreIcon size={14} />
        </span>
      </div>
    </figure>
  );
}

/**
 * Step 02: one guest in a scatter of the room, with two of the people around
 * them picked out. Pure illustration, so it is hidden from assistive tech;
 * the step's own text says what it shows.
 */
function MatchScene() {
  const others = [
    { x: 16, y: 22, picked: false },
    { x: 80, y: 18, picked: true },
    { x: 88, y: 64, picked: false },
    { x: 22, y: 78, picked: true },
    { x: 60, y: 86, picked: false },
    { x: 40, y: 12, picked: false },
  ];

  return (
    <div aria-hidden="true" className="kami-match">
      <svg preserveAspectRatio="none" viewBox="0 0 100 100">
        {others
          .filter((o) => o.picked)
          .map((o) => (
            <line key={`${o.x}-${o.y}`} x1="50" x2={o.x} y1="48" y2={o.y} />
          ))}
      </svg>
      {others.map((o) => (
        <span
          className="kami-match__dot"
          data-picked={o.picked}
          key={`${o.x}-${o.y}`}
          style={{ left: `${o.x}%`, top: `${o.y}%` }}
        />
      ))}
      <span className="kami-match__guest" style={{ left: "50%", top: "48%" }}>
        <MatchIcon size={16} />
      </span>
    </div>
  );
}

/** Step 03: the introduction itself, as the host would say it. */
function IntroScene() {
  const { left, right } = content.real.badge;

  return (
    <div aria-hidden="true" className="kami-intro">
      <span className="kami-intro__person">{left.slice(0, 1)}</span>
      <span className="kami-intro__join">
        <JoinIcon size={14} />
      </span>
      <span className="kami-intro__person">{right.slice(0, 1)}</span>
      <p className="kami-intro__line">
        “{left}, meet {right}.”
      </p>
    </div>
  );
}

const scenes = [CallScene, MatchScene, IntroScene];

export function HowItWorks() {
  const { how } = content;

  return (
    <section className="kami-section" id={how.id}>
      <div className="kami-wrap kami-journey">
        <header className="kami-journey__head">
          <div>
            <Eyebrow>{how.eyebrow}</Eyebrow>
            <Headline lines={how.headline} />
          </div>
          <div className="kami-journey__intro">
            <p className="kami-body">{how.body}</p>
            <span aria-hidden="true" className="kami-journey__aside">
              <Hand>{how.marginalia}</Hand>
              <HandArrow className="kami-journey__arrow" />
            </span>
          </div>
        </header>

        <div className="kami-journey__track">
          {/* Drawn along the row of beads as the reader arrives, left to
              right: the order the steps happen in. */}
          <Thread
            className="kami-journey__thread"
            d="M 0 50 L 100 50"
            reveal="right"
          />

          <ol className="kami-journey__steps">
            {how.steps.map((step, index) => {
              const Icon = icons[step.icon];
              const Scene = scenes[index];
              return (
                <li className="kami-stage" key={step.n}>
                  <div className="kami-stage__scene">
                    <Scene />
                  </div>
                  <span aria-hidden="true" className="kami-stage__bead">
                    {step.n}
                  </span>
                  <p className="kami-stage__title">
                    <span className="kami-stage__icon">
                      <Icon size={16} />
                    </span>
                    {step.title}
                  </p>
                  <p className="kami-stage__body">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
