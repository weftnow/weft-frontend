"use client";

import { ConversationProvider } from "./ConversationProvider";
import { ConversationRouter } from "./ConversationRouter";

export type ConversationProps = {
  eventId: string;
};

export function Conversation({ eventId }: ConversationProps) {
  return (
    <ConversationProvider>
      <ConversationRouter eventId={eventId} />
    </ConversationProvider>
  );
}
