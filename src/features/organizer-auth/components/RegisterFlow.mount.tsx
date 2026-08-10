import { expect, test } from "bun:test";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import type { OrganizerAuthClient } from "../api/client/organizerAuth.client";
import type { RegisterRequestDto } from "../types/organizerAuth.types";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/organizer-auth/register",
});
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
Object.defineProperty(dom.window.HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value() {},
});
Object.assign(globalThis, {
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement,
  HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
  Node: dom.window.Node,
  SVGElement: dom.window.SVGElement,
  cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
  document: dom.window.document,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  navigator: dom.window.navigator,
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
  window: dom.window,
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { RegisterFlow } = await import("./RegisterFlow");
const { OrganizerAuthClientError } = await import("../api/client/organizerAuth.client");

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + 5_000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error("Registration flow timed out");
    await act(async () => wait(10));
  }
}

function buttonNamed(container: HTMLElement, name: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  if (!button) throw new Error(`Button not found: ${name}`);
  return button;
}

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}

async function enter(container: HTMLElement, value: string) {
  const input = container.querySelector<HTMLInputElement>("input:not([type=hidden])");
  if (!input) throw new Error("Active input not found");
  await act(async () => setInput(input, value));
  await act(async () => {
    input.dispatchEvent(new window.KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
    }));
  });
}

async function withFlow(
  client: OrganizerAuthClient,
  run: (container: HTMLElement) => Promise<void>,
  options: { timezone?: () => string } = {},
) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);
  await act(async () => {
    root.render(
      <RegisterFlow
        client={client}
        onAuthenticated={() => {}}
        readTimezone={options.timezone}
      />,
    );
  });
  try {
    await run(container);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}

async function withCompletedFlow(
  client: OrganizerAuthClient,
  run: (container: HTMLElement) => Promise<void>,
) {
  await withFlow(client, async (container) => {
    await enter(container, "Ana Restrepo");
    await enter(container, "Weft Events");
    await act(async () => buttonNamed(container, "Founder").click());
    await act(async () => buttonNamed(container, "Continue").click());
    await enter(container, "ana@example.com");
    await enter(container, "longenough");
    await run(container);
  });
}

const registrations: RegisterRequestDto[] = [];
const client: OrganizerAuthClient = {
  login: async () => {},
  register: async (body) => {
    registrations.push(body);
  },
};

test("registration renders exactly one question and follows the approved order", async () => {
  await withFlow(client, async (container) => {
    expect(container.textContent).toContain("What should we call you?");
    expect(container.querySelectorAll("[data-registration-question]")).toHaveLength(1);
    await enter(container, "Ana Restrepo");
    expect(container.textContent).toContain("What organization are you hosting with?");
    await enter(container, "Weft Events");
    expect(container.textContent).toContain("What's your role?");
    await act(async () => buttonNamed(container, "Event Manager").click());
    await act(async () => buttonNamed(container, "Continue").click());
    expect(container.textContent).toContain("What's your work email?");
    await enter(container, "ana@example.com");
    expect(container.textContent).toContain("Create a password.");
  });
});

test("language changes copy without clearing answers", async () => {
  await withFlow(client, async (container) => {
    await enter(container, "Ana Restrepo");
    await act(async () => buttonNamed(container, "Español").click());
    expect(container.textContent).toContain("¿Con qué organización haces tus eventos?");
    await act(async () => buttonNamed(container, "Atrás").click());
    const input = container.querySelector<HTMLInputElement>("input");
    expect(input?.value).toBe("Ana Restrepo");
  });
});

test("completed registration sends language, canonical role, timezone, and no WhatsApp", async () => {
  registrations.length = 0;
  await withFlow(client, async (container) => {
    await enter(container, "Ana Restrepo");
    await enter(container, "Weft Events");
    await act(async () => buttonNamed(container, "Founder").click());
    await act(async () => buttonNamed(container, "Continue").click());
    await enter(container, "ana@example.com");
    await enter(container, "longenough");
    await waitFor(() => registrations.length === 1);
    expect(registrations[0]).toEqual({
      contact_name: "Ana Restrepo",
      organization_name: "Weft Events",
      role: "founder",
      email: "ana@example.com",
      password: "longenough",
      timezone: "America/Bogota",
      default_language: "en",
    });
    expect("whatsapp" in registrations[0]).toBe(false);
  }, { timezone: () => "America/Bogota" });
});

test("duplicate email returns to email with a login link", async () => {
  const duplicateClient: OrganizerAuthClient = {
    login: async () => {},
    register: async () => {
      throw new OrganizerAuthClientError({ code: "emailAlreadyRegistered" });
    },
  };
  await withCompletedFlow(duplicateClient, async (container) => {
    await waitFor(() => container.textContent?.includes("already exists") === true);
    expect(container.textContent).toContain("What's your work email?");
    expect(container.querySelector('a[href="/organizer/login"]')).toBeDefined();
  });
});

test("Other is a terminal role value and reveals no text field", async () => {
  await withFlow(client, async (container) => {
    await enter(container, "Ana");
    await enter(container, "Weft");
    await act(async () => buttonNamed(container, "Other").click());
    expect(container.querySelectorAll("input")).toHaveLength(0);
    expect(
      container.querySelector('[data-registration-question] [role="radio"][aria-checked="true"]')
        ?.textContent,
    ).toContain("Other");
  });
});

test("role uses roving radio focus and does not auto-advance", async () => {
  await withFlow(client, async (container) => {
    await enter(container, "Ana");
    await enter(container, "Weft");
    const founder = buttonNamed(container, "Founder");
    founder.focus();
    await act(async () => {
      founder.dispatchEvent(new window.KeyboardEvent(
        "keydown",
        { bubbles: true, cancelable: true, key: "ArrowRight" },
      ));
    });
    const community = buttonNamed(container, "Community Manager");
    expect(community.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(community);
    expect(container.textContent).toContain("What's your role?");
  });
});

test("focus follows every question, including the role group", async () => {
  await withFlow(client, async (container) => {
    await waitFor(() => document.activeElement?.getAttribute("type") === "text");
    await enter(container, "Ana");
    await enter(container, "Weft");
    await waitFor(() => document.activeElement?.getAttribute("role") === "radio");
    expect(document.activeElement?.textContent).toContain("Founder");
  });
});
