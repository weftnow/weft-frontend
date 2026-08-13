"use client";

import { useEffect, useRef, useState } from "react";
import type { ConversationLanguage } from "@/features/conversation/i18n/conversation.messages";
import { eventFeedbackApi as defaultApi, type EventFeedbackApi } from "../api/client/eventFeedback.api";
import { eventFeedbackMessagesFor } from "../i18n/eventFeedback.messages";
import type { EventFeedbackSubmission } from "../schemas/eventFeedback.schema";
import styles from "./EventFeedback.module.css";
import { EventFeedbackForm } from "./EventFeedbackForm";
import { EventFeedbackThanks } from "./EventFeedbackThanks";

export type EventFeedbackScreenProps = {
  eventId: string;
  language: ConversationLanguage;
  api?: EventFeedbackApi;
};

type Screen = "form" | "thanks" | "no_link" | "unavailable";

/**
 * The status read decides which screen a returning guest lands on, so nobody
 * meets a form that will refuse them. It is deliberately not blocking: if the
 * read fails, the form renders anyway and a duplicate submission comes back as
 * `already_submitted`, which lands on the same thanks screen. There is no
 * polling here — the session is over.
 *
 * The one read failure that does block is an unconfigured server: that form is
 * guaranteed to be refused on send, so showing it would only cost the guest the
 * paragraph they wrote first.
 */
export function EventFeedbackScreen({
  api = defaultApi,
  eventId,
  language,
}: EventFeedbackScreenProps) {
  const [screen, setScreen] = useState<Screen>("form");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tablemates, setTablemates] = useState<{ displayName: string }[]>([]);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void api.getStatus(eventId).then((result) => {
      if (cancelled) return;
      if ("notConfigured" in result) {
        setScreen("unavailable");
        return;
      }
      if (!("submitted" in result)) return;
      if (result.submitted) setScreen("thanks");
      else setTablemates(result.tablemates);
    });
    return () => {
      cancelled = true;
    };
  }, [api, eventId]);

  function handleSubmit(answers: EventFeedbackSubmission) {
    // Stops one phone firing a second request before the first has answered.
    // A genuine double submission is refused by the backend regardless.
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setFailed(false);

    void api
      .submit(eventId, answers)
      .then((outcome) => {
        if (outcome.status === "recorded" || outcome.status === "already_submitted") {
          setScreen("thanks");
          return;
        }
        if (outcome.status === "no_attendee_token") {
          setScreen("no_link");
          return;
        }
        // Retrying cannot reach a server that has no data source, so the guest
        // is taken off the form rather than left pressing a dead button.
        if (outcome.status === "not_configured") {
          setScreen("unavailable");
          return;
        }
        setFailed(true);
      })
      .finally(() => {
        inFlight.current = false;
        setSubmitting(false);
      });
  }

  if (screen === "thanks") return <EventFeedbackThanks language={language} />;

  if (screen === "no_link" || screen === "unavailable") {
    const messages = eventFeedbackMessagesFor(language);
    return (
      <main className={styles.shell}>
        <section className={`${styles.frame} ${styles.thanksFrame}`}>
          <p className={styles.note} role="alert">
            {screen === "no_link" ? messages.noLink : messages.unavailable}
          </p>
        </section>
      </main>
    );
  }

  return (
    <EventFeedbackForm
      failed={failed}
      language={language}
      onSubmit={handleSubmit}
      submitting={submitting}
      tablemates={tablemates}
    />
  );
}
