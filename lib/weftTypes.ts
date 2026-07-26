// Mirrors the weft_core contract (see its README "The API").
// Kept in one file so a backend contract change has exactly one place to land.

/** Backend answer shape: single questions take an index, pick-2 take two. */
export type BackendAnswers = Record<string, number | number[]>;

export type AnswersRequest = {
  name: string;
  email: string;
  phone: string;
  answers: BackendAnswers;
  /** Omit to start a chain; present means answering someone's invite. */
  invite_token?: string;
};

export type OriginatorResponse = {
  role: "originator";
  session_id: string;
  share_token: string;
};

export type ResponderResponse = {
  role: "responder";
  session_id: string;
  share_token: string;
  pair_id: string;
};

/** Discriminated on `role` — the presence of invite_token decides which. */
export type AnswersResponse = OriginatorResponse | ResponderResponse;

/**
 * Exactly what `public_bank()` sends: options are plain strings in a fixed
 * order, and that order is the wire identity of an answer. `seg` is the
 * segment the question loads onto -- carried through untouched.
 */
export type BankQuestion = {
  id: string;
  prompt: string;
  kind: "single" | "pick2";
  seg: number;
  options: string[];
};

export type BankResponse = {
  questions: BankQuestion[];
  question_set: string[];
};

export type InviteResponse = {
  from_name: string;
  question_set: string[];
  questions: BankQuestion[];
};

export type ValueEntry = {
  key: string;
  name: string;
  tagline: string;
  blurb: string;
};

/** One person inside a pair result. Never raw scores, never their answers. */
export type PairPerson = {
  name: string;
  top_values: ValueEntry[];
  humour: string;
  opens_up: string;
  pace: string;
  life_stage: string;
};

export type PairResult = {
  headline: string;
  /**
   * The pair's overall fit on the backend's native -1..1 scale -- not a
   * percentage. `scorePercent()` in lib/pairView.ts turns it into one.
   */
  score: number;
  band: string;
  shared_values: ValueEntry[];
  difference: string;
  people: PairPerson[];
};

/**
 * A pair as it appears in someone's list of matches: the same friend-safe
 * result, plus the id needed to link to its own page. The backend spreads the
 * one into the other (`weft/api.py:197`), so the shapes cannot drift apart.
 */
export type PairSummary = PairResult & { pair_id: string };

export type PairsResponse = { pairs: PairSummary[] };
