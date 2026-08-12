"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import type { ConversationMessages } from "../../i18n/conversation.messages";
import type { Participant } from "../types/fastQuestions.types";
import styles from "./FastQuestions.module.css";

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
        <Image
          alt=""
          className={styles.avatar}
          height={96}
          sizes="(max-width: 32rem) 15vw, 4.5rem"
          src={participant.avatarUrl}
          title={participant.firstName}
          width={96}
        />
        {active ? <span aria-hidden="true" className={styles.activityDot} /> : null}
      </span>
      <span className={styles.participantName} title={participant.firstName}>
        {participant.firstName}
      </span>
    </motion.li>
  );
}
