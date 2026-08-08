import {
  createQuestionnaireState,
  type QuestionnaireState,
} from "../model/questionnaire.reducer";
import type { Language } from "../schemas/questionnaire.contract.schema";
import { draftRecordSchema } from "../schemas/questionnaire.schema";
import type { DraftRecord, Questionnaire } from "../types/questionnaire.types";

export type QuestionnaireStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export const QUESTIONNAIRE_DRAFT_PREFIX = "weft:b2b-questionnaire:v1:";

export function draftKey(formToken: string): string {
  return `${QUESTIONNAIRE_DRAFT_PREFIX}${formToken}`;
}

const fallbackByStorage = new WeakMap<object, QuestionnaireStorage>();
const serverStorage = createMemoryQuestionnaireStorage();

export function createMemoryQuestionnaireStorage(
  initialValue?: string,
): QuestionnaireStorage {
  const values = new Map<string, string>();

  return {
    getItem(key) {
      if (values.has(key)) return values.get(key) ?? null;
      return initialValue ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

function safeStorage(storage: QuestionnaireStorage): QuestionnaireStorage {
  let fallback = fallbackByStorage.get(storage);
  if (!fallback) {
    fallback = createMemoryQuestionnaireStorage();
    fallbackByStorage.set(storage, fallback);
  }

  return {
    getItem(key) {
      try {
        return storage.getItem(key) ?? fallback.getItem(key);
      } catch {
        return fallback.getItem(key);
      }
    },
    setItem(key, value) {
      fallback.setItem(key, value);
      try {
        storage.setItem(key, value);
      } catch {
        // The in-memory mirror keeps the current visit usable.
      }
    },
  };
}

function defaultStorage(): QuestionnaireStorage {
  if (typeof window === "undefined") return serverStorage;
  try {
    return window.localStorage;
  } catch {
    return serverStorage;
  }
}

export function readDraft(
  formToken: string,
  storage: QuestionnaireStorage = defaultStorage(),
): DraftRecord | null {
  const raw = safeStorage(storage).getItem(draftKey(formToken));
  if (!raw) return null;
  try {
    return draftRecordSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeDraft(
  formToken: string,
  record: DraftRecord,
  storage: QuestionnaireStorage = defaultStorage(),
): void {
  safeStorage(storage).setItem(draftKey(formToken), JSON.stringify(record));
}

export function writeCompleted(
  formToken: string,
  state: QuestionnaireState,
  storage: QuestionnaireStorage = defaultStorage(),
): void {
  writeDraft(formToken, toCompletedRecord(state), storage);
}

export function toDraftRecord(state: QuestionnaireState): DraftRecord {
  return {
    schemaVersion: 1,
    formVersion: state.questionnaire.version,
    language: state.questionnaire.language,
    updatedAt: new Date().toISOString(),
    status: "draft",
    answers: state.answers,
    currentQuestionIndex: state.currentQuestionIndex,
    submissionId: state.submissionId,
  };
}

export function toCompletedRecord(state: QuestionnaireState): DraftRecord {
  return {
    schemaVersion: 1,
    formVersion: state.questionnaire.version,
    language: state.questionnaire.language,
    updatedAt: new Date().toISOString(),
    status: "completed",
  };
}

export type HydrateDraftOutcome =
  | { kind: "fresh"; state: QuestionnaireState }
  | { kind: "resumed"; state: QuestionnaireState }
  | { kind: "versionReset"; state: QuestionnaireState }
  | { kind: "completed"; language: Language };

export function hydrateDraft(
  questionnaire: Questionnaire,
  record: DraftRecord | null,
): HydrateDraftOutcome {
  if (record === null) {
    return {
      kind: "fresh",
      state: createQuestionnaireState(questionnaire, {
        submissionId: crypto.randomUUID(),
      }),
    };
  }

  if (record.status === "completed") {
    return { kind: "completed", language: record.language };
  }

  if (record.formVersion !== questionnaire.version) {
    return {
      kind: "versionReset",
      state: createQuestionnaireState(questionnaire, {
        submissionId: crypto.randomUUID(),
      }),
    };
  }

  return {
    kind: "resumed",
    state: {
      questionnaire,
      status: "active",
      answers: record.answers,
      currentQuestionIndex: record.currentQuestionIndex,
      submissionId: record.submissionId,
      resetReason: null,
      submissionError: null,
      correctionQuestionId: null,
    },
  };
}
