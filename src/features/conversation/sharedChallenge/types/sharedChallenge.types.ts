import type { z } from "zod";
import type { sharedChallengeSessionSchema } from "../schemas/sharedChallenge.schema";

export type SharedChallengeSession = z.infer<typeof sharedChallengeSessionSchema>;
