import { z } from "zod";

const tablemateSchema = z.object({
  display_name: z.string().trim().min(1).max(200),
  company: z.string().trim().min(1).max(200).nullable(),
  role: z.string().trim().min(1).max(200),
  profile: z.string().trim().min(1).max(1_000),
  // The opaque handle for sending this person feedback — signed by the
  // backend, never a raw attendee id. Feedback is keyed by it because two
  // guests at one table can share a display name.
  ref: z.string().min(1),
}).strict();

export const groupRevealSchema = z.object({
  group_index: z.number().int().nonnegative(),
  colour: z.string().trim().min(1).max(20),
  confirmed: z.boolean(),
  reveal_at: z.iso.datetime({ offset: true }),
  server_time: z.iso.datetime({ offset: true }),
  tablemates: z.array(tablemateSchema).max(20),
}).strict();

export type GroupReveal = z.infer<typeof groupRevealSchema>;
