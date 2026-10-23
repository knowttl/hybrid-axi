import { z } from "zod";

export const sample = z.looseObject({ sha256: z.string().nullable(), verdict: z.string().nullable().optional(), threat_score: z.number().nullable().optional() });
const report = z.looseObject({ id: z.string().nullable(), verdict: z.string().nullable().optional() });
export const hashResult = z.looseObject({ sha256s: z.array(z.string()), reports: z.array(report) });
const termsEnvelope = z.looseObject({ count: z.number().int().nonnegative(), result: z.array(sample) });
export const termsResult = z.union([z.array(termsEnvelope), termsEnvelope.transform((row) => [row])]);
const queryId = z.string().regex(/^[A-Za-z0-9_-]{1,256}$/);
const queryEnvelope = z.looseObject({ id: queryId.optional(), query_status: z.string(), number_of_results: z.number().int().nonnegative().optional(), number_of_pages: z.number().int().nonnegative().optional(), results: z.array(sample).optional() });
export const queryResult = z.union([z.array(queryEnvelope), queryEnvelope.transform((row) => [row])]);
const startEnvelope = z.looseObject({ id: queryId });
export const queryStart = z.union([z.array(startEnvelope).length(1), startEnvelope.transform((row) => [row])]);
const overview = { sha256: z.string().nullable(), verdict: z.string().nullable().optional(), threat_score: z.number().nullable().optional() };
export const stableOverview = z.looseObject({ ...overview, reports: z.array(z.string()) });
export const labsOverview = z.looseObject({ ...overview, report_ids: z.looseObject({ sandbox_job_ids: z.array(z.string()) }) });
