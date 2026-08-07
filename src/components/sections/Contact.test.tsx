import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Contact } from "./Contact";

test("contact panel renders its four contact rows and labelled fields", () => {
  const html = renderToStaticMarkup(<Contact />);

  expect(html).toContain('aria-label="WhatsApp"');
  expect(html).toContain('aria-label="Email"');
  expect(html).toContain('aria-label="Instagram"');
  expect(html).toContain('aria-label="LinkedIn"');
  expect(html).toContain("https://www.instagram.com/_weftnow/");
  expect(html).toContain("https://www.linkedin.com/company/weftnow/");
  expect(html).toContain('for="contact-name"');
  expect(html).toContain('id="contact-name"');
  expect(html).toContain('for="contact-email"');
  expect(html).toContain('id="contact-email"');
  expect(html).toContain('for="contact-event"');
  expect(html).toContain('id="contact-event"');
  expect(html.includes("Placeholder artwork for the Weft contact panel")).toBe(false);
  expect(html.indexOf("Make your event the one") < html.indexOf("<form")).toBe(true);
  expect(html.indexOf("<form") < html.indexOf('aria-label="Contact details"')).toBe(true);
  expect(html).toContain("Privacy");
  expect(html).toContain("Terms");
  expect(html.includes('href="#"')).toBe(false);
});
