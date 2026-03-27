import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const auditLogsTable = pgTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  actorId: text("actor_id"),
  actorEmail: text("actor_email"),
  actorRole: text("actor_role"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  targetLabel: text("target_label"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("audit_logs_created_at_idx").on(t.createdAt),
  index("audit_logs_actor_id_idx").on(t.actorId),
  index("audit_logs_target_type_idx").on(t.targetType),
]);

export type AuditLog = typeof auditLogsTable.$inferSelect;
