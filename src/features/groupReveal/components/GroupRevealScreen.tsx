"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { GroupRevealLoadErrorKind } from "../api/groupReveal.api";
import type { GroupReveal } from "../schemas/groupReveal.schema";
import { avatarToneFor, groupColourFor, initialsFor } from "../model/groupReveal.model";
import { useGroupReveal } from "../hooks/useGroupReveal";
import {
  colourLabelFor,
  groupRevealLanguageFor,
  groupRevealMessages,
  type GroupRevealMessages,
} from "../i18n/groupReveal.messages";
import styles from "./GroupReveal.module.css";
import {
  ArrowRightIcon,
  CheckIcon,
  ConversationIcon,
  InfoIcon,
  UsersIcon,
} from "./icons";
import { GroupRevealError } from "./GroupRevealError";
import { GroupRevealWaiting } from "./GroupRevealWaiting";

/** Position in the arrival cascade, read by the CSS as an animation delay. */
function step(index: number): CSSProperties {
  return { "--step": index } as CSSProperties;
}

export function GroupRevealView({
  group,
  error,
  confirmationError,
  confirming,
  remaining,
  messages,
  retry,
  confirm,
  onStartConversation,
  onRestartQuestionnaire,
}: {
  group: GroupReveal | undefined;
  error: GroupRevealLoadErrorKind | null;
  confirmationError: boolean;
  confirming: boolean;
  remaining: number;
  messages: GroupRevealMessages;
  retry: () => Promise<void>;
  confirm: () => Promise<boolean>;
  onStartConversation: () => void;
  onRestartQuestionnaire: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (group && remaining === 0) heading.current?.focus();
  }, [group, remaining]);

  if (error) {
    return (
      <GroupRevealError
        error={error}
        messages={messages}
        onAction={
          error === "no_session"
            ? onRestartQuestionnaire
            : () => void retry()
        }
      />
    );
  }

  if (!group) {
    return (
      <GroupRevealWaiting
        detail={messages.waitingDetail}
        status={messages.waiting}
      />
    );
  }

  if (remaining > 0) {
    return (
      <main className={styles.shell}>
        <section className={styles.countdownStage}>
          <p className={styles.eyebrow}>{messages.waiting}</p>
          <p aria-live="polite" className={styles.countdown}>
            {messages.countdown.replace(
              "{seconds}",
              String(Math.ceil(remaining / 1_000)),
            )}
          </p>
        </section>
      </main>
    );
  }

  // One button, two jobs: it records that this person found their table — the
  // number the host watches on the dashboard — and then opens the
  // conversation. A confirmation that will not land must never strand someone
  // at their own table, so the second tap goes through regardless.
  const start = async () => {
    if (group.confirmed || confirmationError) {
      onStartConversation();
      return;
    }
    if (await confirm()) onStartConversation();
  };

  return (
    <main className={styles.shell}>
      <div className={styles.frame}>
        <header className={styles.hero}>
          <span aria-hidden="true" className={styles.mark}>
            <CheckIcon />
          </span>
          <p className={`${styles.badge} ${styles.reveal}`} style={step(0)}>
            <span aria-hidden="true" className={styles.badgeDot} />
            {messages.matchFound}
          </p>
          <h1
            className={`${styles.title} ${styles.reveal}`}
            ref={heading}
            style={step(1)}
            tabIndex={-1}
          >
            {messages.allSet}
          </h1>
          <p className={`${styles.lede} ${styles.reveal}`} style={step(2)}>
            {messages.lede}
          </p>
        </header>

        <section
          className={`${styles.card} ${styles.reveal}`}
          style={{ ...step(3), "--group-colour": groupColourFor(group.colour) } as CSSProperties}
        >
          <div className={styles.groupHead}>
            <span aria-hidden="true" className={styles.groupAvatar}>
              <UsersIcon />
            </span>
            <div>
              <h2 className={styles.groupName}>
                {messages.group} {group.group_index + 1}
              </h2>
              <p className={styles.colourLine}>
                <span aria-hidden="true" className={styles.colourDot} />
                {colourLabelFor(group.colour, messages)}
              </p>
            </div>
            <p className={styles.countChip}>
              <UsersIcon />
              {/* The viewer counts too: the payload lists everyone but them. */}
              {messages.people.replace(
                "{count}",
                String(group.tablemates.length + 1),
              )}
            </p>
          </div>

          <ul className={styles.members}>
            {group.tablemates.map((mate) => (
              <li
                className={styles.member}
                data-tone={avatarToneFor(mate.display_name)}
                key={mate.ref}
              >
                <span aria-hidden="true" className={styles.avatar}>
                  {initialsFor(mate.display_name)}
                </span>
                <div className={styles.who}>
                  <h3 className={styles.name}>{mate.display_name}</h3>
                  <p className={styles.role}>
                    {mate.company
                      ? messages.roleAt
                          .replace("{role}", mate.role)
                          .replace("{company}", mate.company)
                      : mate.role}
                  </p>
                  <p className={styles.profile}>{mate.profile}</p>
                </div>
                {mate.company ? (
                  <span className={styles.company}>
                    <span aria-hidden="true" className={styles.companyMark}>
                      {Array.from(mate.company)[0].toUpperCase()}
                    </span>
                    <span className={styles.companyName}>{mate.company}</span>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className={`${styles.cta} ${styles.reveal}`} style={step(4)}>
          <span aria-hidden="true" className={styles.ctaIcon}>
            <ConversationIcon />
          </span>
          <h2 className={styles.ctaTitle}>{messages.startTitle}</h2>
          <p className={styles.ctaBody}>{messages.startBody}</p>
          {confirmationError ? (
            <p className={styles.confirmationError} role="alert">
              {messages.confirmationError}
            </p>
          ) : null}
          <button
            className={styles.primaryButton}
            disabled={confirming}
            onClick={() => void start()}
            type="button"
          >
            {confirming ? messages.starting : messages.startConversation}
            <ArrowRightIcon />
          </button>
        </section>

        <p className={`${styles.footnote} ${styles.reveal}`} style={step(5)}>
          <InfoIcon />
          {messages.footnote}
        </p>
      </div>
    </main>
  );
}

export function GroupRevealScreen({ formToken }: { formToken: string }) {
  const router = useRouter();
  const state = useGroupReveal(formToken);
  const messages = useMemo(
    () =>
      groupRevealMessages[
        groupRevealLanguageFor(
          typeof navigator === "undefined" ? undefined : navigator.language,
        )
      ],
    [],
  );

  return (
    <GroupRevealView
      {...state}
      messages={messages}
      onStartConversation={() =>
        router.push(
          `/questionnaire/${encodeURIComponent(formToken)}/conversation`,
        )
      }
      onRestartQuestionnaire={() =>
        router.push(`/questionnaire/${encodeURIComponent(formToken)}`)
      }
    />
  );
}
