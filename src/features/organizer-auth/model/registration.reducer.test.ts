import { expect, test } from "bun:test";
import {
  createRegistrationState,
  registrationReducer,
} from "./registration.reducer";
import { REGISTER_STEPS } from "../types/organizerAuth.types";

test("registration follows the approved five-step order", () => {
  let state = createRegistrationState();
  expect(REGISTER_STEPS).toEqual([
    "contact_name",
    "organization_name",
    "role",
    "email",
    "password",
  ]);
  for (let index = 1; index < REGISTER_STEPS.length; index += 1) {
    state = registrationReducer(state, { type: "next" });
    expect(state.stepIndex).toBe(index);
  }
  expect(registrationReducer(state, { type: "next" }).stepIndex).toBe(4);
});

test("back and language changes preserve entered answers", () => {
  let state = createRegistrationState();
  state = registrationReducer(state, {
    type: "setTextValue",
    field: "contactName",
    value: "Ana",
  });
  state = registrationReducer(state, { type: "next" });
  state = registrationReducer(state, { type: "setLanguage", language: "es" });
  state = registrationReducer(state, { type: "back" });
  expect(state.language).toBe("es");
  expect(state.draft.contactName).toBe("Ana");
  expect(state.stepIndex).toBe(0);
});

test("a server field failure returns to the affected step", () => {
  let state = createRegistrationState();
  for (let index = 1; index < REGISTER_STEPS.length; index += 1) {
    state = registrationReducer(state, { type: "next" });
  }
  state = registrationReducer(state, {
    type: "fieldFailure",
    field: "email",
    code: "email",
  });
  expect(state.stepIndex).toBe(3);
  expect(state.fieldError).toEqual({ field: "email", code: "email" });
  expect(state.status).toBe("idle");
});
