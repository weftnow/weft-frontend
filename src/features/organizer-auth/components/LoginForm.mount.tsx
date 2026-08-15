import { expect, test } from "bun:test";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import type { OrganizerAuthClient } from "../api/client/organizerAuth.client";
import type { LoginRequestDto } from "../types/organizerAuth.types";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/organizer-auth/login",
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
const { LoginForm } = await import("./LoginForm");
const { OrganizerAuthClientError } = await import("../api/client/organizerAuth.client");

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + 5_000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error("Login flow timed out");
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

async function withLogin(
  login: (body: LoginRequestDto) => Promise<void>,
  run: (container: HTMLElement) => Promise<void>,
  onAuthenticated: () => void = () => {},
) {
  const client: OrganizerAuthClient = {
    login,
    register: async () => {},
  };
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);
  await act(async () => {
    root.render(
      <LoginForm client={client} onAuthenticated={onAuthenticated} />,
    );
  });
  try {
    await run(container);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}

test("login keeps email and password together with password-manager autocomplete", async () => {
  await withLogin(async () => {}, async (container) => {
    const email = container.querySelector<HTMLInputElement>('input[type="email"]');
    const password = container.querySelector<HTMLInputElement>('input[type="password"]');
    expect(email).toBeDefined();
    expect(password).toBeDefined();
    expect(email?.getAttribute("autocomplete")).toBe("username");
    expect(password?.getAttribute("autocomplete")).toBe("current-password");
    expect(container.textContent).toContain("Welcome back.");
  });
});

test("login offers no way to sign up", async () => {
  // Registering stays a backend capability with no front door on the site.
  // The endpoint still accepts it, so this is the only thing keeping the two
  // apart -- a link put back here quietly reopens self-service sign-up.
  await withLogin(async () => {}, async (container) => {
    const hrefs = Array.from(container.querySelectorAll("a"))
      .map((link) => link.getAttribute("href"));
    expect(hrefs).not.toContain("/organizer/register");
    expect(container.textContent).not.toContain("Create an account");
    expect(container.textContent).not.toContain("New to Weft?");
  });
});

test("valid login submits once and reports authentication", async () => {
  const submitted: LoginRequestDto[] = [];
  let authenticated = 0;
  await withLogin(
    async (body) => { submitted.push(body); },
    async (container) => {
      await act(async () => setInput(
        container.querySelector<HTMLInputElement>('input[type="email"]')!,
        "ana@example.com",
      ));
      await act(async () => setInput(
        container.querySelector<HTMLInputElement>('input[type="password"]')!,
        "longenough",
      ));
      await act(async () => buttonNamed(container, "Sign in").click());
      await waitFor(() => authenticated === 1);
      expect(submitted).toEqual([{ email: "ana@example.com", password: "longenough" }]);
    },
    () => { authenticated += 1; },
  );
});

test("invalid credentials stay generic and preserve the email", async () => {
  await withLogin(
    async () => {
      throw new OrganizerAuthClientError({ code: "invalidCredentials" });
    },
    async (container) => {
      const email = container.querySelector<HTMLInputElement>('input[type="email"]')!;
      const password = container.querySelector<HTMLInputElement>('input[type="password"]')!;
      await act(async () => setInput(email, "ana@example.com"));
      await act(async () => setInput(password, "wrong"));
      await act(async () => buttonNamed(container, "Sign in").click());
      await waitFor(() => container.textContent?.includes("email or password") === true);
      expect(email.value).toBe("ana@example.com");
      expect(password.value).toBe("wrong");
      expect(document.activeElement).toBe(password);
      expect(password.selectionStart).toBe(0);
      expect(password.selectionEnd).toBe(password.value.length);
      expect(container.textContent).not.toContain("account does not exist");
    },
  );
});

test("language selector translates login without clearing fields", async () => {
  await withLogin(async () => {}, async (container) => {
    const email = container.querySelector<HTMLInputElement>('input[type="email"]')!;
    await act(async () => setInput(email, "ana@example.com"));
    await act(async () => buttonNamed(container, "Español").click());
    expect(container.textContent).toContain("Qué bueno verte de nuevo.");
    expect(email.value).toBe("ana@example.com");
  });
});
