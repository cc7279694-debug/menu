import { z } from "zod";
export const entityIdSchema = z.string().min(1).max(128);
export const utcTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  .refine(
    (v) => Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v,
    "时间无效",
  );
