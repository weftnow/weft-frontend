import { describe, expect, test } from "bun:test";
import { content } from "./content";

describe("placeholder media catalog", () => {
  test("contains the approved image-led page inventory", () => {
    expect(content.media.heroRail).toHaveLength(7);
    expect(content.media.portraits).toHaveLength(3);
    expect(content.media.how).toHaveLength(3);
  });

  test("ships only local, replaceable assets with intrinsic sizes", () => {
    const media = [
      ...content.media.heroRail,
      ...content.media.portraits,
      ...content.media.how,
      content.media.problem,
      content.media.outcome,
      ...content.media.testimonialAvatars,
      content.media.contact,
    ];

    for (const item of media) {
      expect(item.src.startsWith("/placeholders/weft/")).toBe(true);
      expect(item.width).toBeGreaterThan(0);
      expect(item.height).toBeGreaterThan(0);
      expect(item.alt.length).toBeGreaterThan(8);
      expect(item.placeholder).toBe(true);
    }
  });
});

test("uses the approved hero message", () => {
  expect(content.hero.headline).toEqual([
    {
      text: "Matched on what matters, not your badge.",
      muted: "",
      accent: "your badge",
    },
  ]);
  expect(content.hero.sub).toBe(
    "Weft matches attendees on their goals, expertise, and values, not small talk. Finding the right people becomes the best part of the night.",
  );
});

test("uses the approved featured story and outcome messages", () => {
  expect(content.testimonials.items).toHaveLength(5);
  expect(content.media.testimonialAvatars).toHaveLength(5);
  expect(content.testimonials.items[0].quote).toBe(
    "The best part was seeing people stay do not want to leave even after the event ended",
  );
  expect(content.testimonials.outcomes).toEqual([
    "Turn random networking into real connection",
    "Make your event impossible to forget",
    "Prove your event created real value",
  ]);
});

test("every testimonial declares its content type", () => {
  expect(
    content.testimonials.items.every((item) => item.type === "quote"),
  ).toBe(true);
});

describe("compatibility test content", () => {
  test("intro no longer promises three questions", () => {
    // The served quiz is twenty questions long.
    expect(content.compatibilityTest.intro.sub).not.toContain("Three");
  });

  test("the quiz chrome reads from content, not from the component", () => {
    expect(content.compatibilityTest.quiz).toEqual({
      // {n} and {total} are filled in by CompatibilityTest.
      progress: "Question {n} of {total}",
      back: "Back",
      next: "Next",
    });
  });

  test("details step matches the approved copy exactly", () => {
    expect(content.compatibilityTest.details).toEqual({
      eyebrow: "Last thing",
      headline: "Where should we send your thread?",
      sub: "We need this to match you with whoever answers your link.",
      fieldsLabel: "Your details",
      fields: { name: "Your name", email: "Email", phone: "Phone" },
      cta: "Get my link",
      back: "Back",
      failed: "We couldn't save that. Please try again.",
      incomplete: "Please answer every question before we can weave your thread.",
      stranded: "Your result is ready, but we couldn't open it. Use the link below.",
    });
  });

  test("share screen matches the approved copy exactly", () => {
    expect(content.compatibilityTest.share).toEqual({
      eyebrow: "Your link is ready",
      headline: "Now send it to one person.",
      sub: "Compatibility takes two. Your result appears the moment someone answers your link — and you'll both see it.",
      copy: "Copy link",
      copied: "Copied ✓",
      note: "Keep this link. It's also how you come back to see your match.",
      restart: "Start over",
      announce: "Link copied to clipboard",
      matchesLink: "See who's answered",
      linkLabel: "Your link",
    });
  });

  test("no solo archetype result survives in the copy", () => {
    expect("result" in content.compatibilityTest).toBe(false);
  });

  test("loader supplies multiple phrases", () => {
    expect(content.compatibilityTest.loaderPhrases.length).toBeGreaterThan(2);
  });

  test("the invite intro matches the approved copy exactly", () => {
    expect(content.compatibilityTest.invite).toEqual({
      eyebrow: "You've been invited",
      // withName() fills these slots; a lost slot would greet nobody.
      headline: "{name} wants to know how you two connect.",
      sub: "The same twenty questions they answered, about four minutes. Answer them and you'll both see the result.",
      cta: "Answer {name}'s questions",
    });
  });

  test("a dead invite says which way it died", () => {
    expect(content.compatibilityTest.inviteError).toEqual({
      expired: {
        eyebrow: "Link expired",
        headline: "This invitation has run out.",
        body: "Invitations last thirty days. Ask whoever sent it for a fresh link — or start a thread of your own.",
      },
      unknown: {
        eyebrow: "Link not found",
        headline: "We can't find that invitation.",
        body: "The link may have been mistyped or cut short somewhere along the way. Ask for it again, or start a thread of your own.",
      },
      unavailable: {
        eyebrow: "Not right now",
        headline: "We couldn't reach the service.",
        body: "Something on our side is having a moment. The link is still good — try it again shortly.",
      },
      cta: "Start your own",
    });
  });

  test("the pair screen matches the approved copy exactly", () => {
    expect(content.compatibilityTest.pair).toEqual({
      eyebrow: "Your fit",
      scoreLabel: "Fit score",
      // {percent} is filled by the component; read to screen readers after scoreLabel.
      scoreOutOf: "{percent} out of 100",
      // shown under the number so nobody reads it as a percentage or a grade
      scoreUnit: "fit",
      scoreNote:
        "A fit score out of 100, from values, outlook, humour and pace — not a grade.",
      scaleLow: "Different",
      scaleHigh: "Aligned",
      sharedLabel: "What you both lead with",
      peopleLabel: "How you each read",
      noShared: "You don't share a top value — which is its own kind of interesting.",
      sharedTag: "Shared",
      notMeasured: "not measured",
      differenceLabel: "Where you differ",
      traits: {
        humour: "Humour",
        opensUp: "Opens up",
        pace: "Pace",
        lifeStage: "Life stage",
      },
      shareHeadline: "Now send yours to someone else.",
      shareSub: "The same twenty questions, a different person, a different result.",
      restart: "Take it yourself",
      matchesLink: "See all your threads",
      missing: {
        eyebrow: "Not found",
        headline: "We can't find that result.",
        body: "The link may have been mistyped or cut short. Ask whoever shared it to send it again.",
      },
      unavailable: {
        eyebrow: "Not right now",
        headline: "We couldn't reach the service.",
        body: "Something on our side is having a moment. Try the link again shortly.",
      },
    });
  });

  test("every trait the backend sends has a label", () => {
    // The four keys personTraits() reads. A renamed key would silently drop a
    // line from every person card.
    expect(Object.keys(content.compatibilityTest.pair.traits).sort()).toEqual([
      "humour",
      "lifeStage",
      "opensUp",
      "pace",
    ]);
  });

  test("the matches screen matches the approved copy exactly", () => {
    expect(content.compatibilityTest.matches).toEqual({
      eyebrow: "Your threads",
      headline: "Everyone who's answered you.",
      // {count} is filled in by the page; the singular form avoids "1 matches".
      countOne: "One person has answered your link.",
      countMany: "{count} people have answered your link.",
      open: "See the full result",
      waiting: {
        eyebrow: "Nothing yet",
        headline: "Nobody's answered your link yet.",
        body: "Compatibility takes two. Send your link to one more person — the result appears the moment they finish.",
        cta: "Get a fresh link",
        failed: "We couldn't make a new link just now. Please try again.",
      },
      none: {
        eyebrow: "Nothing here yet",
        headline: "You haven't taken this yet.",
        body: "Answer twenty questions, send the link you get, and this is where your results will be.",
        cta: "Take the test",
      },
      lost: {
        eyebrow: "Thread not found",
        headline: "We've lost track of your thread.",
        body: "This browser remembers taking the test, but we can no longer find it. Starting again takes about four minutes.",
        cta: "Start again",
      },
      unavailable: {
        eyebrow: "Not right now",
        headline: "We couldn't reach the service.",
        body: "Something on our side is having a moment. Your thread is safe — try again shortly.",
        cta: "Try again",
      },
    });
  });
});
