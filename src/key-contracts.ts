import { z } from "zod";

// Key and user details are intentionally absent from the decoded public view.
export const keyDecoder = z.object({ auth_level_name: z.string() });
const values = z.looseObject({
  hour: z.number().int().nullable().optional(), day: z.number().int().nullable().optional(),
  week: z.number().int().nullable().optional(), month: z.number().int().nullable().optional(),
  year: z.number().int().nullable().optional(), omega: z.number().int().nullable().optional(),
});
const quotaForType = z.looseObject({ quota: values, used: values, available: values, quota_reached: z.boolean() });
const overall = z.looseObject({ apikey: quotaForType.nullable(), quota_reached: z.boolean(), total: quotaForType.nullable().optional() });
export const quotaDecoder = z.looseObject({ detonation: overall, quick_scan: overall });
