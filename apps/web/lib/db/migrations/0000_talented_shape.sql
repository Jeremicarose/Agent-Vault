CREATE TABLE "api_proxies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"target_url" text NOT NULL,
	"encrypted_headers" jsonb,
	"payment_address" varchar(42) NOT NULL,
	"price_per_request" bigint NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"category" varchar(50),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"http_method" varchar(10) DEFAULT 'GET' NOT NULL,
	"request_body_template" text,
	"query_params_template" text,
	"variables_schema" jsonb DEFAULT '[]'::jsonb,
	"example_response" text,
	"content_type" varchar(100) DEFAULT 'application/json',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proxy_id" uuid NOT NULL,
	"requester_wallet" varchar(42),
	"status" varchar(20) NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
ALTER TABLE "api_proxies" ADD CONSTRAINT "api_proxies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_proxy_id_api_proxies_id_fk" FOREIGN KEY ("proxy_id") REFERENCES "public"."api_proxies"("id") ON DELETE cascade ON UPDATE no action;