"use client";

import { ConversationProvider } from "./ConversationProvider";
import { ConversationRouter } from "./ConversationRouter";
import type { ConversationApi } from "../types/conversation.types";

export type ConversationProps = {
  eventId: string;
  api?: ConversationApi;
};

export function Conversation({ eventId, api }: ConversationProps) {
  return (
    <ConversationProvider>
      <ConversationRouter eventId={eventId} api={api} />
    </ConversationProvider>
  );
}
