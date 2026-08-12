"use client";

import { useId, useState } from "react";
import type { ConversationLanguage } from "@/features/conversation/i18n/conversation.messages";
import { eventFeedbackMessagesFor } from "../i18n/eventFeedback.messages";
import type { EventFeedbackSubmission } from "../schemas/eventFeedback.schema";
import styles from "./EventFeedback.module.css";

const RECOMMEND_SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const RATINGS = [1, 2, 3, 4, 5];

export type EventFeedbackFormProps = {
  language: ConversationLanguage;
  submitting: boolean;
  /** Set when a submission failed and the answers are still on screen. */
  failed: boolean;
  onSubmit: (answers: EventFeedbackSubmission) => void;
};

/**
 * All three answers are required, which is a product decision made knowing it
 * costs some submissions. Send stays visibly disabled until the form is
 * complete so that "not yet" never reads as "broken".
 *
 * Holds its own answers so a failed send keeps what the guest typed — losing a
 * paragraph someone just wrote is the worst thing this screen can do.
 */
export function EventFeedbackForm({
  failed,
  language,
  onSubmit,
  submitting,
}: EventFeedbackFormProps) {
  const messages = eventFeedbackMessagesFor(language);
  const headingId = useId();
  const recommendId = useId();
  const ratingId = useId();
  const improvementId = useId();

  const [recommendScore, setRecommendScore] = useState<number | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [improvement, setImprovement] = useState("");

  const complete =
    recommendScore !== null && rating !== null && improvement.trim().length > 0;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!complete || submitting) return;
    onSubmit({
      recommendScore: recommendScore as number,
      rating: rating as number,
      improvement: improvement.trim(),
    });
  }

  return (
    <main className={styles.shell}>
      <form aria-labelledby={headingId} className={styles.frame} onSubmit={handleSubmit}>
        <h1 className={styles.heading} id={headingId}>
          {messages.heading}
        </h1>

        <fieldset aria-labelledby={recommendId} className={styles.field}>
          <legend className={styles.question} id={recommendId}>
            {messages.recommendQuestion}
          </legend>
          <div className={styles.scale}>
            {RECOMMEND_SCORES.map((score) => (
              <button
                aria-label={messages.recommendOption(score)}
                aria-pressed={recommendScore === score}
                className={styles.option}
                key={score}
                onClick={() => setRecommendScore(score)}
                type="button"
              >
                {score}
              </button>
            ))}
          </div>
          <p className={styles.scaleEnds}>
            <span>{messages.recommendLow}</span>
            <span>{messages.recommendHigh}</span>
          </p>
        </fieldset>

        <fieldset aria-labelledby={ratingId} className={styles.field}>
          <legend className={styles.question} id={ratingId}>
            {messages.ratingQuestion}
          </legend>
          <div className={`${styles.scale} ${styles.ratingScale}`}>
            {RATINGS.map((value) => (
              <button
                aria-label={messages.ratingOption(value)}
                aria-pressed={rating === value}
                className={styles.option}
                key={value}
                onClick={() => setRating(value)}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>

        <div className={styles.field}>
          <label className={styles.question} htmlFor={improvementId}>
            {messages.improvementQuestion}
          </label>
          <textarea
            className={styles.textarea}
            id={improvementId}
            maxLength={2000}
            onChange={(event) => setImprovement(event.target.value)}
            placeholder={messages.improvementPlaceholder}
            value={improvement}
          />
        </div>

        <div className={styles.footer}>
          {failed ? (
            <p className={styles.note} role="alert">
              {messages.failed}
            </p>
          ) : null}
          <button className={styles.submit} disabled={!complete || submitting} type="submit">
            {submitting ? messages.submitting : messages.submit}
          </button>
          {complete ? null : <p className={styles.note}>{messages.incomplete}</p>}
        </div>
      </form>
    </main>
  );
}
