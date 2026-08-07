import { describe, expect, test } from "bun:test";
import {
  clampPreviewIndex,
  getNextOpenIndex,
  getPortraitDisclosureState,
  getPortraitTransforms,
  getTestimonialScrollTarget,
  PORTRAIT_SPREAD_TRANSFORMS,
  PORTRAIT_STACKED_TRANSFORMS,
  togglePortraitExpanded,
} from "./interactions";

test("preview index stays within the three-step media catalog", () => {
  expect(clampPreviewIndex(-1, 3)).toBe(0);
  expect(clampPreviewIndex(1, 3)).toBe(1);
  expect(clampPreviewIndex(4, 3)).toBe(2);
});

describe("portrait stack transforms", () => {
  test("matches the measured Zolo resting geometry", () => {
    expect(PORTRAIT_STACKED_TRANSFORMS).toEqual([
      "translate3d(90px, 20px, 0) rotate(-15deg)",
      "translate3d(0, 0, 0) rotate(0deg)",
      "translate3d(-90px, 20px, 0) rotate(15deg)",
    ]);
  });

  test("spreads every portrait for hover, tap, or reduced motion", () => {
    expect(getPortraitTransforms(true, false)).toEqual(
      PORTRAIT_SPREAD_TRANSFORMS,
    );
    expect(getPortraitTransforms(false, true)).toEqual(
      PORTRAIT_SPREAD_TRANSFORMS,
    );
  });

  test("keeps the measured stack when inactive", () => {
    expect(getPortraitTransforms(false, false)).toEqual(
      PORTRAIT_STACKED_TRANSFORMS,
    );
  });
});

describe("portrait stack disclosure state", () => {
  test("announces reduced-motion portraits as already spread", () => {
    expect(getPortraitDisclosureState(false, true)).toBe(true);
    expect(getPortraitDisclosureState(false, false)).toBe(false);
  });

  test("toggles from the state captured before pointer focus", () => {
    expect(togglePortraitExpanded(false)).toBe(true);
    expect(togglePortraitExpanded(true)).toBe(false);
  });
});

describe("one-open disclosure state", () => {
  test("opens a different row", () => {
    expect(getNextOpenIndex(0, 2)).toBe(2);
  });

  test("closes the active row", () => {
    expect(getNextOpenIndex(2, 2)).toBeNull();
  });
});

describe("testimonial rail scroll target", () => {
  test("advances by one card", () => {
    expect(
      getTestimonialScrollTarget({ direction: 1, scrollLeft: 0, maxScroll: 900, step: 300 }),
    ).toBe(300);
  });

  test("wraps to the start when advancing past the last card", () => {
    expect(
      getTestimonialScrollTarget({ direction: 1, scrollLeft: 900, maxScroll: 900, step: 300 }),
    ).toBe(0);
  });

  test("wraps to the end when reversing past the first card", () => {
    expect(
      getTestimonialScrollTarget({ direction: -1, scrollLeft: 0, maxScroll: 900, step: 300 }),
    ).toBe(900);
  });

  test("steps back by one card", () => {
    expect(
      getTestimonialScrollTarget({ direction: -1, scrollLeft: 600, maxScroll: 900, step: 300 }),
    ).toBe(300);
  });
});
