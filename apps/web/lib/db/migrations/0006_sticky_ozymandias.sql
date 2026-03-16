CREATE TABLE "mcp_server_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mcp_server_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"tool_name" varchar(100),
	"tool_description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_mcp_server_workflow" UNIQUE("mcp_server_id","workflow_id")
);
--> statement-breakpoint
CREATE TABLE "workflow_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"input_schema" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"workflow_definition" jsonb NOT NULL,
	"output_schema" jsonb,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_workflow_slug" UNIQUE("user_id","slug")
);
--> statement-breakpoint
ALTER TABLE "oauth_access_tokens" ADD COLUMN "mcp_slug" varchar(50);--> statement-breakpoint
ALTER TABLE "mcp_server_workflows" ADD CONSTRAINT "mcp_server_workflows_mcp_server_id_mcp_servers_id_fk" FOREIGN KEY ("mcp_server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_server_workflows" ADD CONSTRAINT "mcp_server_workflows_workflow_id_workflow_templates_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_mcp_server_workflows_server" ON "mcp_server_workflows" USING btree ("mcp_server_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_templates_user" ON "workflow_templates" USING btree ("user_id");