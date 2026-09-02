import { describe, expect, test } from "bun:test";
import { content } from "./content";

type Asset = { src: string; width: number; height: number; alt: string };

const everyAsset = (): Asset[] => [
  ...content.media.heroRail,
  ...content.media.portraits,
  ...content.media.how,
  content.media.problem,
  content.media.outcome,
  content.media.contact,
  ...content.testimonials.items.flatMap((item) =>
    "photo" in item && item.photo ? [item.photo] : [],
  ),
];

describe("media catalog", () => {
  test("contains the approved image-led page inventory", () => {
    expect(content.media.heroRail).toHaveLength(7);
    expect(content.media.portraits).toHaveLength(3);
    expect(content.media.how).toHaveLength(3);
  });

  test("ships only local assets with intrinsic sizes", () => {
    for (const item of everyAsset()) {
      expect(item.src.startsWith("/images/")).toBe(true);
      expect(item.width).toBeGreaterThan(0);
      expect(item.height).toBeGreaterThan(0);
      expect(item.alt.length).toBeGreaterThan(8);
    }
  });

  // Alt text is read out loud, crawled, and shown when an image 404s. The word
  // "placeholder" sitting beside a real customer quote is what this guards.
  test("no asset describes itself as a placeholder", () => {
    for (const item of everyAsset()) {
      expect(item.alt.toLowerCase()).not.toContain("placeholder");
      expect(item.src.toLowerCase()).not.toContain("placeholder");
    }
  });
});

test("uses the approved hero message, aimed at organizers", () => {
  expect(content.hero.eyebrow).toBe("The networking layer for business events");
  expect(content.hero.headline).toEqual([
    {
      text: "Where attendees finally meet the right people.",
      muted: "",
      accent: "right",
    },
  ]);
  expect(content.hero.sub).toBe(
    "Weft matches your attendees into small groups based on their goals and values, then guides the conversation. Great connections become your event's reputation.",
  );
  // The buyer's action is the loud one; the attendee demo is the quiet one.
  expect(content.hero.ctaPrimary).toBe("Book a call");
  expect(content.hero.ctaPrimaryHref).toBe("#contact");
  expect(content.hero.ctaSecondary).toBe("Try the matching");
  expect(content.hero.ctaSecondaryHref).toBe("/match");
});

test("the reveal section ships no stats until measured ones exist", () => {
  expect("stats" in content.reveal).toBe(false);
});

test("uses the approved featured story and outcome messages", () => {
  expect(content.testimonials.items).toHaveLength(5);
  expect(content.testimonials.items[0].quote).toBe(
    "The best part was seeing that people stayed. They did not want to leave even after the event ended.",
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

// A named quote beside a stranger's face reads as a fabrication, so a story
// either carries a photo of the person who said it or falls back to initials.
test("every named story carries its own photo or its initials", () => {
  for (const item of content.testimonials.items) {
    const hasPhoto = "photo" in item && Boolean(item.photo);
    const hasInitials = "initials" in item && Boolean(item.initials);
    expect(hasPhoto || hasInitials).toBe(true);
    if (hasPhoto) {
      expect(item.photo.alt).toContain(item.name);
    }
  }
});

test("the organizer section spells out the job and the deliverables", () => {
  const [doing, getting] = content.organizer.blocks;

  expect(content.organizer.lead).toBe(
    "When networking fails, attendees don't come back, and you're left refilling the room with new people every event. Weft fixes the reason they leave.",
  );
  expect(doing.title).toBe("What you do");
  expect(doing.items).toEqual([
    "Send us your attendee list, or connect your Luma or Eventbrite event.",
    "Pick the moment for the group reveal.",
    "That's it. No app for attendees to download, no software for your team to learn.",
  ]);
  expect(getting.title).toBe("What you get");
  expect(getting.items).toEqual([
    "A live dashboard showing who came to meet whom.",
    "Guided group conversations that run themselves.",
    "A post-event report: which attendees want to meet again, and how the room rated it.",
    "Follow-up second meetings arranged for mutual matches.",
  ]);
});

// No price has been supplied, so the line anchors the shape of the number
// without inventing one.
test("the contact panel anchors pricing without quoting a figure", () => {
  expect(content.contact.pricing).toBe(
    "Flat pricing by event size. One number, agreed before your event, no per-guest surprises.",
  );
  expect(content.contact.pricing).not.toContain("$");
});
