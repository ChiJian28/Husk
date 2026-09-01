import { z } from 'zod';

export const OfficialEventSchema = z.looseObject({
  id: z.string(),
  ts_utc: z.string(),
  name: z.string(),
  category: z.string(),
  importance: z.string().optional(),
  assets_affected: z.array(z.string()).optional(),
  ts_precision: z.string().optional(),
  ts_basis: z.string().optional(),
  thesis: z.string().optional(),
});

export const RunMetaSchema = z.looseObject({
  horizon_days: z.number().optional(),
  hard_expiry_at: z.string().optional(),
  report_date: z.string().optional(),
  expected_next_run_at: z.string().optional(),
});

export const OfficialReportSchema = z.looseObject({
  schema_version: z.union([z.string(), z.number()]).optional(),
  events: z.array(OfficialEventSchema),
  run_meta: RunMetaSchema.optional(),
  as_of: z.unknown().optional(),
});

export type OfficialReport = z.infer<typeof OfficialReportSchema>;
export type OfficialEvent = z.infer<typeof OfficialEventSchema>;
