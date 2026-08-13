"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ConversationMessages } from "../../i18n/conversation.messages";
import type { Participant } from "../types/fastQuestions.types";
import styles from "./FastQuestions.module.css";

/**
 * Split by code point, not by index: `"Ángela"[0]` is a whole letter here but
 * half of one for a name that starts with an emoji or a surrogate pair.
 */
function initialFor(name: string): string {
  return [...name.trim()][0]?.toUpperCase() ?? "?";
}

export type ParticipantAvatarProps = {
  participant: Participant;
  active: boolean;
  messages: Pick<ConversationMessages, "participantActivity">;
};

export function ParticipantAvatar({ active, messages, participant }: ParticipantAvatarProps) {
  const reducedMotion = Boolean(useReducedMotion());

  return (
    <motion.li
      animate={{ opacity: 1, y: 0 }}
      aria-label={messages.participantActivity(participant.firstName, active)}
      className={styles.participant}
      data-active={active}
      initial={false}
      transition={{ duration: reducedMotion ? 0.01 : 0.18, ease: "easeOut" }}
    >
      <span className={styles.avatarFrame}>
        <span aria-hidden="true" className={styles.avatar} title={participant.firstName}>
          {initialFor(participant.firstName)}
        </span>
        {active ? <span aria-hidden="true" className={styles.activityDot} /> : null}
      </span>
      <span className={styles.participantName} title={participant.firstName}>
        {participant.firstName}
      </span>
    </motion.li>
  );
}
