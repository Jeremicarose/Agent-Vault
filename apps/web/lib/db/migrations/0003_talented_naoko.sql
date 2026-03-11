CREATE TABLE "session_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" varchar(66) NOT NULL,
	"session_key_address" varchar(42) NOT NULL,
	"encrypted_private_key" jsonb NOT NULL,
	"allowed_targets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"allowed_selectors" jsonb DEFAULT '[]'::jsonb,
	"valid_after" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"token_limits" jsonb DEFAULT '[]'::jsonb,
	"approved_contracts" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_keys_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
ALTER TABLE "session_keys" ADD CONSTRAINT "session_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;