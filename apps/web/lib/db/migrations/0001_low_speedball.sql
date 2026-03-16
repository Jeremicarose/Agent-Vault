ALTER TABLE "api_proxies" ADD COLUMN "slug" varchar(100);--> statement-breakpoint
ALTER TABLE "api_proxies" ADD CONSTRAINT "api_proxies_slug_unique" UNIQUE("slug");