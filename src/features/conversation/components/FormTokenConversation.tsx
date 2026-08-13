"use client";

import { Conversation } from "./Conversation";
import { formTokenConversationApi } from "../fastQuestions/api/fastQuestions.api";

/**
 * A guest arriving from the questionnaire talks to the form-token routes, not
 * the event ones, so this screen cannot use `Conversation`'s default api.
 *
 * The choice is made here rather than on the page because the api is an object
 * of functions: handed across the server/client boundary as a prop it is not
 * serializable, and the render fails outright. Picking it inside a client
 * component keeps a plain string as the only thing that has to cross.
 */
export function FormTokenConversation({ formToken }: { formToken: string }) {
  return <Conversation api={formTokenConversationApi} eventId={formToken} />;
}
