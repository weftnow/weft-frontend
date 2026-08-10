"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useReducer, useRef } from "react";
import {
  organizerAuthClient,
  OrganizerAuthClientError,
  type OrganizerAuthClient,
} from "../api/client/organizerAuth.client";
import { organizerAuthMessages } from "../i18n/organizerAuth.messages";
import {
  createRegistrationState,
  draftFieldForStep,
  registrationReducer,
} from "../model/registration.reducer";
import {
  resolveBrowserTimezone,
  toRegisterRequest,
  validateRegistrationStep,
} from "../schemas/organizerAuth.schema";
import {
  REGISTER_STEPS,
  type OrganizerLanguage,
  type OrganizerRole,
  type RegisterStep,
} from "../types/organizerAuth.types";
import { AuthShell } from "./AuthShell";
import { RegistrationQuestion } from "./RegistrationQuestion";
import styles from "./OrganizerAuth.module.css";

function isRegisterStep(value: unknown): value is RegisterStep {
  return typeof value === "string"
    && REGISTER_STEPS.some((step) => step === value);
}

export function RegisterFlow({
  client = organizerAuthClient,
  initialLanguage = "en",
  onAuthenticated = () => window.location.replace("/organizer"),
  readTimezone,
}: {
  client?: OrganizerAuthClient;
  initialLanguage?: OrganizerLanguage;
  onAuthenticated?: () => void;
  readTimezone?: () => string;
}) {
  const [state, dispatch] = useReducer(
    registrationReducer,
    initialLanguage,
    createRegistrationState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const inFlight = useRef(false);
  const reduced = Boolean(useReducedMotion());
  const step = REGISTER_STEPS[state.stepIndex];
  const messages = organizerAuthMessages[state.language];

  useEffect(() => {
    const timer = setTimeout(() => {
      formRef.current
        ?.querySelector<HTMLElement>('[data-auth-autofocus="true"]')
        ?.focus();
    }, reduced ? 0 : 180);
    return () => clearTimeout(timer);
  }, [reduced, state.fieldError, step]);

  function failCurrent() {
    dispatch({ type: "fieldFailure", field: step, code: step });
  }

  async function advance() {
    if (state.status === "submitting" || inFlight.current) return;
    if (validateRegistrationStep(step, state.draft)) {
      failCurrent();
      return;
    }
    if (step !== "password") {
      dispatch({ type: "next" });
      return;
    }

    inFlight.current = true;
    dispatch({ type: "submitStart" });
    try {
      await client.register(toRegisterRequest(
        state.draft,
        state.language,
        resolveBrowserTimezone(readTimezone),
      ));
      onAuthenticated();
    } catch (error) {
      if (error instanceof OrganizerAuthClientError) {
        if (error.data.code === "emailAlreadyRegistered") {
          dispatch({
            type: "fieldFailure",
            field: "email",
            code: "emailAlreadyRegistered",
          });
        } else if (
          error.data.code === "validation"
          && isRegisterStep(error.data.field)
        ) {
          const field = error.data.field;
          dispatch({ type: "fieldFailure", field, code: field });
        } else {
          dispatch({ type: "submissionFailure" });
        }
      } else {
        dispatch({ type: "submissionFailure" });
      }
    } finally {
      inFlight.current = false;
      dispatch({ type: "submitEnd" });
    }
  }

  const progressLabel = messages.registration.progress
    .replace("{current}", String(state.stepIndex + 1))
    .replace("{total}", String(REGISTER_STEPS.length));

  return (
    <AuthShell
      language={state.language}
      onLanguageChange={(language) => dispatch({ type: "setLanguage", language })}
      progress={{ current: state.stepIndex + 1, total: REGISTER_STEPS.length, label: progressLabel }}
    >
      <motion.form
        className={styles.form}
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          void advance();
        }}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            animate={{ opacity: 1, transform: "translate3d(0, 0, 0)" }}
            exit={{ opacity: 0, transform: "translate3d(0, -12px, 0)" }}
            initial={reduced ? false : { opacity: 0, transform: "translate3d(0, 14px, 0)" }}
            key={step}
            transition={{ duration: reduced ? 0 : 0.28, ease: [0.23, 1, 0.32, 1] }}
          >
            <RegistrationQuestion
              disabled={state.status === "submitting"}
              messages={messages}
              onEnter={() => void advance()}
              onRoleChange={(role: OrganizerRole) => dispatch({ type: "setRole", value: role })}
              onTextChange={(value) => {
                if (step !== "role") {
                  dispatch({
                    type: "setTextValue",
                    field: draftFieldForStep(step),
                    value,
                  });
                }
              }}
              state={state}
              step={step}
            />
          </motion.div>
        </AnimatePresence>
        {state.submissionError ? (
          <p className={styles.error} role="alert">
            {messages.errors[state.submissionError]}
          </p>
        ) : null}
        {state.fieldError?.code === "emailAlreadyRegistered" ? (
          <Link className={styles.inlineLink} href="/organizer/login">{messages.registration.loginLink}</Link>
        ) : null}
        <div className={styles.actions}>
          {state.stepIndex > 0 ? (
            <button
              className={styles.back}
              disabled={state.status === "submitting"}
              onClick={() => dispatch({ type: "back" })}
              type="button"
            >
              {messages.registration.back}
            </button>
          ) : (
            <span>{messages.registration.accountPrompt} <Link href="/organizer/login">{messages.registration.loginLink}</Link></span>
          )}
          <button className={styles.primary} disabled={state.status === "submitting"} type="submit">
            {state.status === "submitting"
              ? messages.registration.submitting
              : step === "password"
                ? messages.registration.submit
                : messages.registration.continue}
          </button>
        </div>
      </motion.form>
    </AuthShell>
  );
}
