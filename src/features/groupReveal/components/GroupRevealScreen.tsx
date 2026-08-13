"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { GroupReveal } from "../schemas/groupReveal.schema";
import { initialsFor } from "../model/groupReveal.model";
import { useGroupReveal } from "../hooks/useGroupReveal";
import {
  groupRevealLanguageFor,
  groupRevealMessages,
} from "../i18n/groupReveal.messages";
import styles from "./GroupReveal.module.css";
import { GroupRevealWaiting } from "./GroupRevealWaiting";

type GroupRevealMessages =
  (typeof groupRevealMessages)[keyof typeof groupRevealMessages];

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
}: {
  group: GroupReveal | undefined;
  error: boolean;
  confirmationError: boolean;
  confirming: boolean;
  remaining: number;
  messages: GroupRevealMessages;
  retry: () => Promise<void>;
  confirm: () => Promise<void>;
  onStartConversation: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (group && remaining === 0) heading.current?.focus();
  }, [group, remaining]);

  if (error) {
    return (
      <main className={styles.shell}>
        <section className={styles.frame}>
          <p role="status">{messages.unavailable}</p>
          <button
            className={styles.secondaryButton}
            onClick={() => void retry()}
          >
            {messages.retry}
          </button>
        </section>
      </main>
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
        <section className={styles.frame}>
          <p className={styles.eyebrow}>{messages.waiting}</p>
          <p className={styles.countdown} aria-live="polite">
            {messages.countdown.replace(
              "{seconds}",
              String(Math.ceil(remaining / 1_000)),
            )}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <section className={styles.frame}>
        <p className={styles.eyebrow}>
          {messages.matchComplete} · {group.tablemates.length}{" "}
          {messages.connections}
        </p>
        <h1 ref={heading} tabIndex={-1}>
          {messages.circleReady}
        </h1>
        <p className={styles.table}>
          {messages.table} {group.group_index + 1} · {group.colour}
        </p>
        <ul className={styles.members}>
          {group.tablemates.map((mate) => (
            <li
              key={`${mate.display_name}-${mate.role}`}
              className={styles.member}
            >
              <span className={styles.avatar} aria-hidden="true">
                {initialsFor(mate.display_name)}
              </span>
              <div>
                <h2>{mate.display_name}</h2>
                <p>
                  {mate.role}
                  {mate.company ? (
                    <>
                      <span aria-hidden="true"> · </span>
                      {mate.company}
                    </>
                  ) : null}
                </p>
                <p className={styles.profile}>{mate.profile}</p>
              </div>
            </li>
          ))}
        </ul>
        {confirmationError ? (
          <p role="alert">{messages.confirmationError}</p>
        ) : null}
        <div className={styles.actionDock}>
          <button
            className={styles.primaryButton}
            disabled={confirming}
            onClick={() =>
              group.confirmed ? onStartConversation() : void confirm()
            }
          >
            {group.confirmed
              ? messages.startConversation
              : confirming
                ? messages.starting
                : messages.foundGroup}
          </button>
        </div>
      </section>
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
    />
  );
}
