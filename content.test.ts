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

  test("details step matches the approved copy exactly", () => {
    expect(content.compatibilityTest.details).toEqual({
      eyebrow: "Last thing",
      headline: "Where should we send your thread?",
      sub: "We need this to match you with whoever answers your link.",
      fields: { name: "Your name", email: "Email", phone: "Phone" },
      cta: "Get my link",
      back: "Back",
      failed: "We couldn't save that. Please try again.",
      incomplete: "Please answer every question before we can weave your thread.",
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
    });
  });

  test("no solo archetype result survives in the copy", () => {
    expect("result" in content.compatibilityTest).toBe(false);
  });

  test("loader supplies multiple phrases", () => {
    expect(content.compatibilityTest.loaderPhrases.length).toBeGreaterThan(2);
  });
});
