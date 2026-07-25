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

export type BankOption = { id: string; label: string };

export type BankQuestion = {
  id: string;
  prompt: string;
  kind: "single" | "multi";
  helper?: string;
  select?: number;
  segment?: number;
  options: BankOption[];
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
  band: string;
  shared_values: ValueEntry[];
  difference: string;
  people: PairPerson[];
};

export type PairSummary = PairResult & { pair_id: string };

export type PairsResponse = { pairs: PairSummary[] };
