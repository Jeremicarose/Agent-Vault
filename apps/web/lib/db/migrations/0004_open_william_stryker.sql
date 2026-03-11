CREATE TABLE "oauth_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"client_id" varchar(100) NOT NULL,
	"user_id" uuid NOT NULL,
	"session_key_id" uuid NOT NULL,
	"scopes" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_access_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "oauth_auth_codes" (
	"code" varchar(128) PRIMARY KEY NOT NULL,
	"client_id" varchar(100) NOT NULL,
	"user_id" uuid NOT NULL,
	"requested_scopes" jsonb NOT NULL,
	"approved_scopes" jsonb NOT NULL,
	"session_config" jsonb NOT NULL,
	"code_challenge" varchar(128) NOT NULL,
	"code_challenge_method" varchar(10) DEFAULT 'S256' NOT NULL,
	"redirect_uri" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oauth_clients" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"secret_hash" varchar(128) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"logo_url" text,
	"redirect_uris" jsonb NOT NULL,
	"allowed_scopes" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_keys" ADD COLUMN "scopes" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "session_keys" ADD COLUMN "on_chain_params" jsonb;--> statement-breakpoint
ALTER TABLE "session_keys" ADD COLUMN "oauth_client_id" varchar(100);--> statement-breakpoint
ALTER TABLE "session_keys" ADD COLUMN "oauth_grant_id" varchar(100);--> statement-breakpoint
ALTER TABLE "oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_client_id_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_session_key_id_session_keys_id_fk" FOREIGN KEY ("session_key_id") REFERENCES "public"."session_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_auth_codes" ADD CONSTRAINT "oauth_auth_codes_client_id_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_auth_codes" ADD CONSTRAINT "oauth_auth_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_oauth_access_tokens_session" ON "oauth_access_tokens" USING btree ("session_key_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_auth_codes_expiry" ON "oauth_auth_codes" USING btree ("expires_at");