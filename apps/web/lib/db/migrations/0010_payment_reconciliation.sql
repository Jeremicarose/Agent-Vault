ALTER TABLE "request_logs" ADD COLUMN "payment_intent_id" uuid;
--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "settlement_tx_hash" varchar(66);
--> statement-breakpoint
ALTER TABLE "payment_intents" ALTER COLUMN "status" TYPE varchar(32);
--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN "settlement_verified_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN "failure_reason" text;
