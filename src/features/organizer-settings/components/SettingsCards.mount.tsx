import { expect, test } from "bun:test";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import type { OrganizerMe, SettingsUpdateBody } from "../schemas/settings.schema";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/organizer/settings",
});
Object.assign(globalThis, {
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement,
  HTMLSelectElement: dom.window.HTMLSelectElement,
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
const { SettingsCards } = await import("./SettingsCards");
const { DashboardClientError } = await import(
  "@/features/organizer-dashboard/api/client/dashboard.client"
);

const ORGANIZER: OrganizerMe = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "a@b.co",
  contact_name: "Ana Restrepo",
  organization_name: "Acme Ventures",
  role: "founder",
  role_other: null,
  timezone: "America/Bogota",
  default_language: "es",
  whatsapp: null,
  plan: "free",
};

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + 5_000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error("Settings save flow timed out");
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

function fieldNamed<T extends HTMLElement>(container: HTMLElement, name: string) {
  return container.querySelector<T>(`[name="${name}"]`)!;
}

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}

test("a rejected password change leaves the organization card's unsaved edit alone", async () => {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);
  await act(async () => {
    root.render(
      <SettingsCards
        client={{
          updateSettings: async () => ORGANIZER,
          changePassword: async () => {
            throw new DashboardClientError("invalidPassword");
          },
        }}
        organizer={ORGANIZER}
      />,
    );
  });

  try {
    // The organization card's edit is never sent — this test is only about
    // whether a failure elsewhere on the page discards it.
    const orgName = fieldNamed<HTMLInputElement>(container, "organization_name");
    await act(async () => setInput(orgName, "Acme Collective"));

    await act(async () =>
      setInput(fieldNamed<HTMLInputElement>(container, "current_password"), "wrong-password"),
    );
    await act(async () =>
      setInput(fieldNamed<HTMLInputElement>(container, "new_password"), "a-new-password"),
    );
    await act(async () => buttonNamed(container, "Change password").click());

    await waitFor(() => container.querySelector('[role="alert"]') !== null);

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "That isn't your current password. The rest of your settings are untouched.",
    );
    expect(orgName.value).toBe("Acme Collective");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("saving Defaults sends Organization's last-saved name, not an unsaved edit", async () => {
  // Regression cover for the inverse of the case above: a *successful* save
  // on one card must not silently commit the other card's unconfirmed edit.
  // Failing to save a mistake is recoverable; writing one nobody asked for
  // is not.
  const calls: SettingsUpdateBody[] = [];
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);
  await act(async () => {
    root.render(
      <SettingsCards
        client={{
          updateSettings: async (body) => {
            calls.push(body);
            return { ...ORGANIZER, ...body };
          },
          changePassword: async () => {},
        }}
        organizer={ORGANIZER}
      />,
    );
  });

  try {
    const orgName = fieldNamed<HTMLInputElement>(container, "organization_name");
    // Edited, never submitted on the Organization card.
    await act(async () => setInput(orgName, "Acme Collective"));

    await act(async () => buttonNamed(container, "Save defaults").click());
    await waitFor(() => calls.length > 0);

    expect(calls[0]?.organization_name).toBe(ORGANIZER.organization_name);
    // And the box itself is untouched by the Defaults round trip — the
    // organizer's unconfirmed edit is still sitting exactly where they left it.
    expect(orgName.value).toBe("Acme Collective");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
