import { z } from "zod";

export const auditInputSchema = z.object({
  sql: z
    .string()
    .trim()
    .min(1, "Paste a SQL migration before running the audit.")
    .max(
      200_000,
      "Keep this review under 200,000 characters. Split larger migrations.",
    ),
  exposedSchema: z
    .string()
    .trim()
    .regex(
      /^[a-z_][a-z0-9_$]*$/i,
      "Use an unquoted PostgreSQL schema identifier, such as public.",
    ),
});

export type AuditInput = z.infer<typeof auditInputSchema>;
