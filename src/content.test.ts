import { describe, expect, test } from "bun:test";
import { content } from "./content";

describe("placeholder media catalog", () => {
  test("contains the approved image-led page inventory", () => {
    expect(content.media.heroRail).toHaveLength(7);
    expect(content.media.portraits).toHaveLength(3);
    expect(content.media.how).toHaveLength(3);
  });

  const everyAsset = () => [
    ...content.media.heroRail,
    ...content.media.portraits,
    ...content.media.how,
    content.media.problem,
    content.media.outcome,
    ...content.media.testimonialAvatars,
    content.media.contact,
  ];

  test("ships only local, replaceable assets with intrinsic sizes", () => {
    for (const item of everyAsset()) {
      expect(item.src.startsWith("/placeholders/weft/")).toBe(true);
      expect(item.width).toBeGreaterThan(0);
      expect(item.height).toBeGreaterThan(0);
      expect(item.alt.length).toBeGreaterThan(8);
      expect(typeof item.placeholder).toBe("boolean");
    }
  });

  // The flag is a ledger of what still needs real art -- nothing renders off
  // it. Pinning the shipped set means swapping in real media fails here until
  // the entry is marked, rather than silently leaving the ledger stale.
  test("marks exactly the assets that are still stand-in art", () => {
    const shipped = everyAsset()
      .filter((item) => !item.placeholder)
      .map((item) => item.src)
      .sort();

    expect(shipped).toEqual([
      "/placeholders/weft/carousel1.JPG",
      "/placeholders/weft/carousel33.png",
      "/placeholders/weft/carousel5.png",
      "/placeholders/weft/how-it-works-1.mp4",
      "/placeholders/weft/how-it-works-3.webm",
      "/placeholders/weft/video1.mp4",
      "/placeholders/weft/video2.mp4",
      "/placeholders/weft/video3.mp4",
      "/placeholders/weft/video4.mp4",
    ]);
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
    "Weft matches attendees on their goals and values, not small talk. Finding the right people becomes the best part of the event.",
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
