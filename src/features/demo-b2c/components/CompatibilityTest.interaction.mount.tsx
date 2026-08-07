import { expect, test } from "bun:test";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { demoB2cContent } from "@/features/demo-b2c/content";
import { toQuizQuestions } from "@/features/demo-b2c/schemas/compatibilityQuestions";
import type { BankQuestion } from "@/features/demo-b2c/types/contracts";

const BANK: BankQuestion[] = [
  {
    id: "Q1",
    prompt: "Pick one",
    kind: "single",
    seg: 1,
    options: ["First", "Second"],
  },
  {
    id: "Q2",
    prompt: "Pick two",
    kind: "pick2",
    seg: 2,
    options: ["Alpha", "Beta", "Gamma"],
  },
];

const QUESTIONS = toQuizQuestions(BANK);
const CANCEL_WAIT_MS = 250;
const CONDITION_TIMEOUT_MS = 2000;

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/match",
});
let container: HTMLDivElement;
let root: Root;

Object.defineProperty(dom.window, "matchMedia", {
  configurable: true,
  value: () => ({
    addEventListener() {},
    dispatchEvent: () => false,
    matches: true,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    removeEventListener() {},
  }),
});
// jsdom's own `pretendToBeVisual` requestAnimationFrame occasionally never
// calls back for framer-motion's exit-animation completion handler once
// nested AnimatePresence trees are involved (WeaveLoader nests its own
// phrase-cycling AnimatePresence inside the "submitting" phase) -- observed
// as an indefinite hang crossing the submitting -> share transition. An
// immediate, macrotask-based rAF sidesteps that reliability gap without
// touching any production code or any timing a visitor would ever notice.
const rafCallbacks = new Map<number, FrameRequestCallback>();
let nextRafId = 0;
function fakeRequestAnimationFrame(callback: FrameRequestCallback): number {
  const id = ++nextRafId;
  rafCallbacks.set(id, callback);
  setTimeout(() => {
    const cb = rafCallbacks.get(id);
    if (cb) {
      rafCallbacks.delete(id);
      cb(Date.now());
    }
  }, 0);
  return id;
}
function fakeCancelAnimationFrame(id: number): void {
  rafCallbacks.delete(id);
}
// Some framer-motion internals read these off `window` explicitly rather
// than the bare global, so both need to point at the same fakes.
Object.assign(dom.window, {
  requestAnimationFrame: fakeRequestAnimationFrame,
  cancelAnimationFrame: fakeCancelAnimationFrame,
});

Object.assign(globalThis, {
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement,
  Node: dom.window.Node,
  SVGElement: dom.window.SVGElement,
  cancelAnimationFrame: fakeCancelAnimationFrame,
  document: dom.window.document,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  navigator: dom.window.navigator,
  requestAnimationFrame: fakeRequestAnimationFrame,
  window: dom.window,
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

// `react-dom/client` feature-detects native input-event support once, at
// module load, against whatever `window`/`document` are global at that
// instant. A static top-level import would run before the jsdom globals
// above exist, permanently disabling that detection and forcing every
// controlled `<input>`'s onChange onto react-dom's IE9 `attachEvent`
// fallback -- which jsdom doesn't implement, so typing into the details form
// below would silently never reach React state. Importing after the globals
// are in place is what lets a plain, real `input` event reach onChange.
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");

function buttonNamed(name: string): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(
    `button[aria-label="${name}"]`,
  );
  if (!button) throw new Error(`Button not found: ${name}`);
  return button;
}

function controls(role: "checkbox" | "radio"): HTMLButtonElement[] {
  return Array.from(
    container.querySelectorAll<HTMLButtonElement>(`button[role="${role}"]`),
  );
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + CONDITION_TIMEOUT_MS;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for questionnaire state");
    }
    await act(async () => wait(10));
  }
}

async function openQuiz() {
  const { CompatibilityTest } = await import("./CompatibilityTest");
  await act(async () => {
    root.render(<CompatibilityTest questions={QUESTIONS} />);
  });
  await act(async () => {
    buttonNamed(demoB2cContent.intro.cta).click();
  });
  await waitFor(() => controls("radio").length > 0);
}

async function withQuestionnaire(run: () => Promise<void>) {
  container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  root = createRoot(container);
  try {
    await openQuiz();
    await run();
  } finally {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  }
}

test("single-choice auto-advance updates one continuous progress bar", async () => {
  await withQuestionnaire(async () => {
    const before = container.querySelector<HTMLElement>('[role="progressbar"]');
    const fill = container.querySelector<HTMLElement>(
      ".ctest-progressbar-fill",
    );
    expect(before?.getAttribute("aria-valuenow")).toBe("1");
    expect(fill?.style.width).toBe("50%");

    await act(async () => {
      controls("radio")[0].click();
    });
    await waitFor(
      () =>
        container
          .querySelector('[role="progressbar"]')
          ?.getAttribute("aria-valuenow") === "2",
    );

    const progressbars = container.querySelectorAll('[role="progressbar"]');
    expect(progressbars).toHaveLength(1);
    expect(progressbars[0]).toBe(before);
    expect(progressbars[0].getAttribute("aria-valuenow")).toBe("2");
    expect(
      container.querySelector<HTMLElement>(".ctest-progressbar-fill")?.style
        .width,
    ).toBe("100%");
  });
});

test("deselecting a single choice cancels its pending auto-advance", async () => {
  await withQuestionnaire(async () => {
    await act(async () => {
      controls("radio")[0].click();
    });
    await act(async () => {
      controls("radio")[0].click();
    });
    await act(async () => wait(CANCEL_WAIT_MS));

    expect(
      container
        .querySelector('[role="progressbar"]')
        ?.getAttribute("aria-valuenow"),
    ).toBe("1");
    expect(controls("radio")[0].getAttribute("aria-checked")).toBe("false");
  });
});

test("multi-choice gates Next, orders Back first, and preserves prior answers", async () => {
  await withQuestionnaire(async () => {
    await act(async () => {
      controls("radio")[0].click();
    });
    await waitFor(
      () =>
        container
          .querySelector('[role="progressbar"]')
          ?.getAttribute("aria-valuenow") === "2",
    );
    await waitFor(() => controls("checkbox").length > 0);

    expect(buttonNamed(demoB2cContent.quiz.next).disabled).toBe(true);

    await act(async () => controls("checkbox")[0].click());
    expect(buttonNamed(demoB2cContent.quiz.next).disabled).toBe(true);

    await act(async () => controls("checkbox")[1].click());
    expect(buttonNamed(demoB2cContent.quiz.next).disabled).toBe(false);

    const footer = container.querySelector(".ctest-quiz-footer");
    const actions = footer?.querySelectorAll("button");
    expect(actions).toHaveLength(2);
    expect(actions?.[0].textContent).toContain(
      demoB2cContent.quiz.back,
    );
    expect(actions?.[1].getAttribute("aria-label")).toBe(
      demoB2cContent.quiz.next,
    );

    await act(async () => {
      actions?.[0].click();
    });
    await waitFor(() => controls("radio").length > 0);
    expect(controls("radio")[0].getAttribute("aria-checked")).toBe("true");
  });
});

/**
 * Sets a controlled input's value the way a real keystroke would: through the
 * native setter (bypassing React's own per-node value-tracking override), so
 * the framework's change detection sees a real difference, then fires the
 * `input` event React listens for.
 */
function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    dom.window.HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}

/**
 * Covers the wiring `ShareScreen.test.tsx` and `content.test.ts` cannot: the
 * path from the fetch response, through `CompatibilityTest`'s state, to the
 * prop `ShareScreen` renders. Those other tests either mount `ShareScreen`
 * with hardcoded props (so a bug in how `CompatibilityTest` fills those props
 * is invisible) or exercise the pure `decideSubmitOutcome` function alone (so
 * a bug in wiring its result into `useState` is invisible). Only a mounted
 * `CompatibilityTest` driven all the way to a real fetch response proves the
 * return token that reaches the DOM is the one the response actually sent --
 * not, say, the share/invite token by an off-by-one prop swap. `share_token`
 * and `return_token` are deliberately different literals so that swap would
 * fail this test instead of passing it by coincidence.
 */
test("the rendered return link carries the response's return token, not its share token", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({
      ok: true,
      json: async () => ({ share_token: "out-1", return_token: "in-1" }),
    }) as unknown as Response) as unknown as typeof fetch;

  try {
    await withQuestionnaire(async () => {
      // Q1 (single) auto-advances once chosen.
      await act(async () => {
        controls("radio")[0].click();
      });
      await waitFor(() => controls("checkbox").length > 0);

      // Q2 (pick-two): choose both, then Next -- the last question, so this
      // lands on the details form.
      await act(async () => controls("checkbox")[0].click());
      await act(async () => controls("checkbox")[1].click());
      await act(async () => {
        buttonNamed(demoB2cContent.quiz.next).click();
      });
      await waitFor(() => container.querySelector("#ctest-name") !== null);

      const nameInput = container.querySelector<HTMLInputElement>("#ctest-name");
      const emailInput = container.querySelector<HTMLInputElement>("#ctest-email");
      const phoneInput = container.querySelector<HTMLInputElement>("#ctest-phone");
      if (!nameInput || !emailInput || !phoneInput) {
        throw new Error("details fields not found");
      }
      await act(async () => {
        typeInto(nameInput, "Ada Lovelace");
        typeInto(emailInput, "ada@example.com");
        typeInto(phoneInput, "+1 555 000 1234");
      });

      const form = container.querySelector("form");
      if (!form) throw new Error("details form not found");
      await act(async () => {
        form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
      });

      await waitFor(() => container.querySelector(".ctest-returnlink-url") !== null);

      // The URL is printed rather than linked -- see `ReturnLink` -- so the
      // token that reached the DOM is read off the text a visitor would copy.
      const returnUrl = container.querySelector(".ctest-returnlink-url");
      expect(returnUrl?.textContent).toContain("/match/thread/in-1");
      // The bug this guards against: the invite/share token ("out-1")
      // landing in the return link instead of the return token ("in-1").
      expect(container.innerHTML).not.toContain("/match/thread/out-1");
      expect(container.innerHTML).toContain("/match/invite/out-1");
      // Copyable, and never a navigation that would take the invite token
      // (client state, listed nowhere) off the screen with it.
      expect(
        container.querySelector<HTMLElement>(".ctest-returnlink-copy")?.textContent,
      ).toBe(demoB2cContent.share.returnCopy);
      expect(container.querySelector('a[href^="/match/thread/"]')).toBeNull();
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
