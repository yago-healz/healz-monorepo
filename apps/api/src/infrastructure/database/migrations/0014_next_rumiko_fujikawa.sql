CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"street" varchar(255) NOT NULL,
	"number" varchar(20) NOT NULL,
	"complement" varchar(100),
	"neighborhood" varchar(100),
	"city" varchar(100) NOT NULL,
	"state" varchar(2) NOT NULL,
	"zip_code" varchar(9) NOT NULL,
	"country" varchar(2) DEFAULT 'BR' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "address_id" uuid;--> statement-breakpoint
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;