import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  text,
  decimal,
  index,
} from "drizzle-orm/pg-core";

export const conversationView = pgTable(
  "conversation_view",
  {
    id: uuid("id").primaryKey(),
    patientId: uuid("patient_id").notNull(),
    tenantId: uuid("tenant_id").notNull(),
    clinicId: uuid("clinic_id").notNull(),

    status: varchar("status", { length: 20 }).notNull().default("active"),
    channel: varchar("channel", { length: 20 }).notNull(),

    isEscalated: boolean("is_escalated").default(false),
    escalatedToUserId: uuid("escalated_to_user_id"),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),

    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    messageCount: integer("message_count").default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("idx_conversation_view_patient").on(table.patientId),
    index("idx_conversation_view_tenant").on(table.tenantId),
    index("idx_conversation_view_status").on(table.status),
    index("idx_conversation_view_escalated").on(table.isEscalated),
  ],
);

export const messageView = pgTable(
  "message_view",
  {
    id: uuid("id").primaryKey(),
    conversationId: uuid("conversation_id").notNull(),

    direction: varchar("direction", { length: 10 }).notNull(), // 'incoming' | 'outgoing'
    fromPhone: varchar("from_phone", { length: 20 }),
    toPhone: varchar("to_phone", { length: 20 }),

    content: text("content").notNull(),
    messageType: varchar("message_type", { length: 20 }).default("text"),
    mediaUrl: text("media_url"),

    sentBy: varchar("sent_by", { length: 20 }), // 'bot' | 'agent' | 'system' | 'patient'

    intent: varchar("intent", { length: 50 }),
    intentConfidence: decimal("intent_confidence", { precision: 3, scale: 2 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("idx_message_view_conversation").on(table.conversationId),
    index("idx_message_view_created_at").on(table.createdAt),
    index("idx_message_view_intent").on(table.intent),
  ],
);
