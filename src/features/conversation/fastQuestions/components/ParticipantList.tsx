import type { CSSProperties } from "react";
import type { ConversationMessages } from "../../i18n/conversation.messages";
import type { Participant } from "../types/fastQuestions.types";
import { ParticipantAvatar } from "./ParticipantAvatar";
import styles from "./FastQuestions.module.css";

export type ParticipantListProps = {
  participants: Participant[];
  activeParticipantId: string;
  messages: Pick<ConversationMessages, "participantActivity" | "participants">;
};

export function ParticipantList({
  activeParticipantId,
  messages,
  participants,
}: ParticipantListProps) {
  return (
    <ol
      aria-label={messages.participants}
      className={styles.participantList}
      data-count={participants.length}
      style={{ "--participant-count": participants.length } as CSSProperties}
    >
      {participants.map((participant) => (
        <ParticipantAvatar
          active={participant.id === activeParticipantId}
          key={participant.id}
          messages={messages}
          participant={participant}
        />
      ))}
    </ol>
  );
}
