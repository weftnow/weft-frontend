import type { Questionnaire } from "../types/questionnaire.types";

/**
 * A small, purpose-built questionnaire for interaction/motion tests — real
 * enough to exercise every composer type Task 7 supports, small enough to
 * keep those tests fast. Task 9 drives the full 17-question bilingual
 * journey against the real backend-shaped fixtures instead.
 */
export const testFlowQuestionnaire: Questionnaire = {
  id: "weft-b2b-attendee",
  version: "v1",
  language: "en",
  eventName: "Test Mixer",
  acceptingSubmissions: true,
  intro: {
    eyebrow: "Weft questionnaire",
    title: "Let’s get to know you",
    subtitle: "This helps us introduce you to the right people in the room.",
    welcome: "Hi, I’m Weft. I’ll ask you a few quick questions to help find your people.",
  },
  completionMessages: [
    "You’re all set.",
    "Thanks. We’ll use your answers to introduce you to the right people.",
  ],
  questions: [
    {
      id: "reason",
      type: "single_choice",
      message: "What brought you here tonight?",
      required: true,
      options: [
        { id: "reason:meet-people", label: "Meet thoughtful new people", value: "meet-people" },
        { id: "reason:collaborators", label: "Find potential collaborators", value: "collaborators" },
      ],
    },
    {
      id: "current-work",
      type: "text",
      message: "What are you currently working on?",
      placeholder: "A project, challenge, or idea…",
      required: true,
      multiline: false,
      inputFormat: "text",
      maxLength: 500,
    },
    {
      id: "relevant-topics",
      type: "multiple_choice",
      message: "What topics feel most relevant to you right now?",
      required: true,
      minSelections: 2,
      maxSelections: 4,
      options: [
        { id: "topics:leadership", label: "Leadership", value: "leadership" },
        { id: "topics:product", label: "Product", value: "product" },
        { id: "topics:ai", label: "AI & technology", value: "ai-technology" },
      ],
    },
  ],
};
