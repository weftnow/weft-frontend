import { z } from "zod";

/**
 * The weft-b2b-backend icebreaker payload, exactly as it arrives. Field names
 * stay snake_case here so the wire format is visible in one place; the mapper
 * is what turns this into the camelCase session the UI renders.
 *
 * Backend source of truth: app/schemas/icebreaker.py (IcebreakerStateOut).
 */

const participantDto = z.object({
  attendee_id: z.uuid(),
  name: z.string(),
});

const questionDto = z.object({
  code: z.string().min(1),
  text: z.string().min(1),
});

const roundDto = questionDto.extend({
  participant_duration_seconds: z.number().int().positive(),
});

export const icebreakerStateDtoSchema = z.object({
  session_id: z.uuid(),
  // `finished` only follows Phase 2. Fast Questions never renders it, but the
  // schema accepts it so a late poll parses instead of throwing.
  status: z.enum(["waiting", "running", "phase_complete", "finished"]),
  language: z.string().min(2),
  phase: z.number().int().min(1).max(2),
  round: z.number().int().min(1),
  total_rounds: z.number().int().min(1),
  question: questionDto.nullable(),
  rounds: z.array(roundDto),
  challenge: z.string().nullable(),
  current_participant: participantDto.nullable(),
  participant_order: z.array(participantDto),
  viewer: participantDto,
  turn_index: z.number().int().min(0),
  participant_duration_seconds: z.number().int().positive().nullable(),
  turn_ends_at: z.iso.datetime({ offset: true }).nullable(),
  closing_line: z.string().nullable(),
});

export type IcebreakerStateDto = z.infer<typeof icebreakerStateDtoSchema>;
