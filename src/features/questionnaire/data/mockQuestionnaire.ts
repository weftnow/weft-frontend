import type { Questionnaire } from "../types/questionnaire.types";

export const mockQuestionnaire = {
  id: "weft-networking-night",
  version: "fixture-v1",
  language: "en",
  eventId: "8f14e45f-ea0c-4d6b-9f1c-2b3a4c5d6e7f",
  eventName: "Weft networking night",
  acceptingSubmissions: true,
  intro: {
    eyebrow: "Weft questionnaire",
    title: "Let’s get to know you",
    subtitle: "This helps us introduce you to the right people in the room.",
    welcome:
      "Hi, I’m Weft. I’ll ask you a few quick questions to help find your people.",
  },
  completionMessages: [
    "You’re all set.",
    "Thanks. We’ll use your answers to introduce you to the right people.",
  ],
  questions: [
    {
      id: "reason-for-coming",
      type: "single_choice",
      message: "What brought you here tonight?",
      required: true,
      options: [
        {
          id: "meet-people",
          label: "Meet thoughtful new people",
          value: "meet-people",
        },
        {
          id: "collaborators",
          label: "Find potential collaborators",
          value: "collaborators",
        },
        {
          id: "learn",
          label: "Learn from people doing adjacent work",
          value: "learn",
        },
        {
          id: "opportunities",
          label: "Explore what might be next",
          value: "opportunities",
        },
      ],
    },
    {
      id: "valuable-people",
      type: "hybrid",
      message: "What kind of people would be most valuable for you to meet?",
      required: true,
      allowOther: true,
      options: [
        {
          id: "founders-operators",
          label: "Founders and operators",
          value: "founders-operators",
        },
        {
          id: "investors-funders",
          label: "Investors and funders",
          value: "investors-funders",
        },
        {
          id: "clients-partners",
          label: "Potential clients or partners",
          value: "clients-partners",
        },
        {
          id: "specialists",
          label: "People with complementary expertise",
          value: "specialists",
        },
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
        { id: "leadership", label: "Leadership", value: "leadership" },
        { id: "product", label: "Product", value: "product" },
        {
          id: "ai-technology",
          label: "AI & technology",
          value: "ai-technology",
        },
        { id: "design", label: "Design", value: "design" },
        { id: "marketing", label: "Marketing", value: "marketing" },
        { id: "sales", label: "Sales", value: "sales" },
        {
          id: "fundraising",
          label: "Fundraising",
          value: "fundraising",
        },
        {
          id: "community",
          label: "Community",
          value: "community",
        },
      ],
    },
    {
      id: "can-help-with",
      type: "text",
      message: "What could you genuinely help someone else with?",
      placeholder: "Something you know, have done, or can unlock…",
      required: true,
      multiline: false,
      inputFormat: "text",
      maxLength: 500,
    },
  ],
} satisfies Questionnaire;
