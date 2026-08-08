import { expect, test } from "bun:test";
import { createQuestionnaireState } from "../model/questionnaire.reducer";
import { formDefinitionSchema } from "../schemas/questionnaire.contract.schema";
import { backendFormEn, backendFormEs } from "../test/backendFormFixtures";
import { mapQuestionnaireDefinition } from "../model/questionnaire.mapper";
import type { DraftRecord } from "../types/questionnaire.types";
import {
  createMemoryQuestionnaireStorage,
  draftKey,
  hydrateDraft,
  readDraft,
  toDraftRecord,
  writeDraft,
} from "./questionnaire.storage";

const questionnaireEn = mapQuestionnaireDefinition(formDefinitionSchema.parse(backendFormEn));
const questionnaireEs = mapQuestionnaireDefinition(formDefinitionSchema.parse(backendFormEs));

const validDraft: DraftRecord = {
  schemaVersion: 1,
  formVersion: "v1",
  language: "en",
  updatedAt: new Date().toISOString(),
  status: "draft",
  answers: { name: "Ana" },
  currentQuestionIndex: 1,
  submissionId: "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
};

test("corrupt storage resets safely and unavailable storage uses memory", () => {
  const corrupt = createMemoryQuestionnaireStorage("not-json");
  expect(readDraft("event-token-1234", corrupt)).toBeNull();

  const unavailable = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  writeDraft("event-token-1234", validDraft, unavailable);
  expect(readDraft("event-token-1234", unavailable)).toEqual(validDraft);
});

test("draft keys are scoped per form token", () => {
  expect(draftKey("token-a")).not.toBe(draftKey("token-b"));
});

test("hydrateDraft returns fresh state when nothing is stored", () => {
  const outcome = hydrateDraft(questionnaireEn, null);
  expect(outcome.kind).toBe("fresh");
});

test("hydrateDraft resumes a compatible in-progress draft", () => {
  const outcome = hydrateDraft(questionnaireEn, validDraft);
  expect(outcome.kind).toBe("resumed");
  if (outcome.kind !== "resumed") throw new Error("expected resumed");
  expect(outcome.state.answers.name).toBe("Ana");
  expect(outcome.state.currentQuestionIndex).toBe(1);
});

test("an incomplete version mismatch resets but completion remains complete", () => {
  const questionnaireV2 = { ...questionnaireEn, version: "v2" };
  const draftV1 = validDraft;
  const completedV1: DraftRecord = {
    schemaVersion: 1,
    formVersion: "v1",
    language: "en",
    updatedAt: new Date().toISOString(),
    status: "completed",
  };

  expect(hydrateDraft(questionnaireV2, draftV1).kind).toBe("versionReset");
  expect(hydrateDraft(questionnaireV2, completedV1).kind).toBe("completed");
});

test("toDraftRecord round-trips through storage", () => {
  const state = createQuestionnaireState(questionnaireEs, {
    submissionId: "5c9c9b0a-2f0a-4c8e-9b0a-2f0a4c8e9b0a",
  });
  const record = toDraftRecord(state);
  const storage = createMemoryQuestionnaireStorage();
  writeDraft("token-round-trip", record, storage);
  expect(readDraft("token-round-trip", storage)).toEqual(record);
  expect(record.language).toBe("es");
});
