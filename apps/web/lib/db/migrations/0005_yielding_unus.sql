CREATE TABLE "mcp_server_tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mcp_server_id" uuid NOT NULL,
	"api_proxy_id" uuid NOT NULL,
	"tool_name" varchar(100),
	"tool_description" text,
	"short_description" varchar(100),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_mcp_server_proxy" UNIQUE("mcp_server_id","api_proxy_id")
);
--> statement-breakpoint
CREATE TABLE "mcp_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_servers_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "mcp_servers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "mcp_server_tools" ADD CONSTRAINT "mcp_server_tools_mcp_server_id_mcp_servers_id_fk" FOREIGN KEY ("mcp_server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_server_tools" ADD CONSTRAINT "mcp_server_tools_api_proxy_id_api_proxies_id_fk" FOREIGN KEY ("api_proxy_id") REFERENCES "public"."api_proxies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_mcp_server_tools_server" ON "mcp_server_tools" USING btree ("mcp_server_id");--> statement-breakpoint
CREATE INDEX "idx_mcp_servers_slug" ON "mcp_servers" USING btree ("slug");--> statement-breakpoint
ALTER TABLE "session_keys" DROP COLUMN "token_limits";