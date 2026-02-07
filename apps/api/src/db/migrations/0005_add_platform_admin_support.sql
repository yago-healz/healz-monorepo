CREATE TABLE "platform_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL UNIQUE,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"revoked_by" uuid
);
--> statement-breakpoint
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_platform_admins_user_id" ON "platform_admins" ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_platform_admins_active" ON "platform_admins" ("revoked_at") WHERE "revoked_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "status" varchar(20) DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "updated_at" timestamp;
--> statement-breakpoint
CREATE INDEX "idx_organizations_status" ON "organizations" ("status");
--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "status" varchar(20) DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "updated_at" timestamp;
--> statement-breakpoint
CREATE INDEX "idx_clinics_status" ON "clinics" ("status");
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" varchar(20) DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deactivated_at" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deactivated_by" uuid;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deactivation_reason" varchar(500);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_deactivated_by_users_id_fk" FOREIGN KEY ("deactivated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_users_status" ON "users" ("status");
--> statement-breakpoint
CREATE INDEX "idx_users_last_login" ON "users" ("last_login_at");
