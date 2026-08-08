import type { CSSProperties } from "react";
import type { Participant } from "../types/fastQuestions.types";
import { ParticipantAvatar } from "./ParticipantAvatar";
import styles from "./FastQuestions.module.css";

export type ParticipantListProps = {
  participants: Participant[];
  activeParticipantId: string;
};

export function ParticipantList({ participants, activeParticipantId }: ParticipantListProps) {
  return (
    <ol
      aria-label="Participants"
      className={styles.participantList}
      data-count={participants.length}
      style={{ "--participant-count": participants.length } as CSSProperties}
    >
      {participants.map((participant) => (
        <ParticipantAvatar
          active={participant.id === activeParticipantId}
          key={participant.id}
          participant={participant}
        />
      ))}
    </ol>
  );
}
