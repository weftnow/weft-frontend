"use client";

import { useEffect, useState, useRef, type FormEvent } from "react";
import {
  organizerAuthClient,
  OrganizerAuthClientError,
  type OrganizerAuthClient,
} from "../api/client/organizerAuth.client";
import { organizerAuthMessages } from "../i18n/organizerAuth.messages";
import { loginRequestSchema } from "../schemas/organizerAuth.schema";
import type { OrganizerLanguage } from "../types/organizerAuth.types";
import { AnimatedPrompt } from "./AnimatedPrompt";
import { AuthShell } from "./AuthShell";
import styles from "./OrganizerAuth.module.css";

type LoginErrorCode =
  | "email"
  | "password"
  | "invalidCredentials"
  | "unavailable";

export function LoginForm({
  client = organizerAuthClient,
  initialLanguage = "en",
  onAuthenticated = () => window.location.replace("/organizer"),
}: {
  client?: OrganizerAuthClient;
  initialLanguage?: OrganizerLanguage;
  onAuthenticated?: () => void;
}) {
  const [language, setLanguage] = useState(initialLanguage);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<LoginErrorCode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const messages = organizerAuthMessages[language];

  useEffect(() => {
    if (submitting || !error) return;
    const target = error === "email" ? emailRef.current : passwordRef.current;
    target?.focus();
    if (error === "invalidCredentials") {
      target?.select();
    }
  }, [error, submitting]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const parsed = loginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      const firstField = parsed.error.issues[0]?.path[0];
      setError(
        firstField === "password"
          ? "password"
          : "email",
      );
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await client.login(parsed.data);
      onAuthenticated();
    } catch (reason) {
      setError(
        reason instanceof OrganizerAuthClientError && reason.data.code === "invalidCredentials"
          ? "invalidCredentials"
          : "unavailable",
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <AuthShell language={language} onLanguageChange={setLanguage}>
      <form className={`${styles.form} ${styles.loginForm}`} noValidate onSubmit={submit}>
        <h1 className={styles.questionPrompt}>
          <span className="sr-only">{messages.login.title}</span>
          <AnimatedPrompt text={messages.login.title} />
        </h1>
        <div className={styles.loginFields}>
          <label>
            <span>{messages.login.emailLabel}</span>
            <input
              autoComplete="username"
              className={styles.loginField}
              disabled={submitting}
              onChange={(event) => { setEmail(event.target.value); setError(null); }}
              ref={emailRef}
              type="email"
              value={email}
            />
          </label>
          <label>
            <span>{messages.login.passwordLabel}</span>
            <input
              autoComplete="current-password"
              className={styles.loginField}
              disabled={submitting}
              onChange={(event) => { setPassword(event.target.value); setError(null); }}
              ref={passwordRef}
              type="password"
              value={password}
            />
          </label>
        </div>
        {error ? (
          <p className={styles.error} role="alert">{messages.errors[error]}</p>
        ) : null}
        <button className={styles.primary} disabled={submitting} type="submit">
          {submitting ? messages.login.submitting : messages.login.submit}
        </button>
      </form>
    </AuthShell>
  );
}
