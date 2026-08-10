import {
  REGISTER_STEPS,
  type OrganizerLanguage,
  type OrganizerRole,
  type RegisterStep,
  type RegistrationDraft,
} from "../types/organizerAuth.types";

export type DraftField = keyof RegistrationDraft;
export type TextDraftField = Exclude<DraftField, "role">;
export type RegistrationFieldErrorCode = RegisterStep | "emailAlreadyRegistered";

export type RegistrationState = {
  stepIndex: number;
  language: OrganizerLanguage;
  draft: RegistrationDraft;
  status: "idle" | "submitting";
  fieldError: {
    field: RegisterStep;
    code: RegistrationFieldErrorCode;
  } | null;
  submissionError: "unavailable" | null;
};

export type RegistrationAction =
  | { type: "setTextValue"; field: TextDraftField; value: string }
  | { type: "setRole"; value: OrganizerRole }
  | { type: "setLanguage"; language: OrganizerLanguage }
  | { type: "next" }
  | { type: "back" }
  | {
      type: "fieldFailure";
      field: RegisterStep;
      code: RegistrationFieldErrorCode;
    }
  | { type: "submissionFailure" }
  | { type: "submitStart" }
  | { type: "submitEnd" };

export function createRegistrationState(
  language: OrganizerLanguage = "en",
): RegistrationState {
  return {
    stepIndex: 0,
    language,
    draft: {
      contactName: "",
      organizationName: "",
      role: null,
      email: "",
      password: "",
    },
    status: "idle",
    fieldError: null,
    submissionError: null,
  };
}

export function registrationReducer(
  state: RegistrationState,
  action: RegistrationAction,
): RegistrationState {
  if (action.type === "setTextValue") {
    return {
      ...state,
      draft: { ...state.draft, [action.field]: action.value },
      fieldError: null,
      submissionError: null,
    };
  }
  if (action.type === "setRole") {
    return {
      ...state,
      draft: { ...state.draft, role: action.value },
      fieldError: null,
      submissionError: null,
    };
  }
  if (action.type === "setLanguage") return { ...state, language: action.language };
  if (action.type === "next") {
    return {
      ...state,
      stepIndex: Math.min(state.stepIndex + 1, REGISTER_STEPS.length - 1),
      fieldError: null,
    };
  }
  if (action.type === "back") {
    return {
      ...state,
      stepIndex: Math.max(state.stepIndex - 1, 0),
      fieldError: null,
      submissionError: null,
    };
  }
  if (action.type === "fieldFailure") {
    return {
      ...state,
      stepIndex: REGISTER_STEPS.indexOf(action.field),
      status: "idle",
      fieldError: { field: action.field, code: action.code },
      submissionError: null,
    };
  }
  if (action.type === "submissionFailure") {
    return { ...state, status: "idle", submissionError: "unavailable" };
  }
  if (action.type === "submitStart") {
    return { ...state, status: "submitting", fieldError: null, submissionError: null };
  }
  return { ...state, status: "idle" };
}

export function draftFieldForStep(
  step: Exclude<RegisterStep, "role">,
): TextDraftField {
  if (step === "contact_name") return "contactName";
  if (step === "organization_name") return "organizationName";
  return step;
}
