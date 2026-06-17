CREATE TABLE "payment_intents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "proxy_id" uuid NOT NULL,
  "session_id" varchar(66) NOT NULL,
  "owner_address" varchar(42) NOT NULL,
  "token_address" varchar(42) NOT NULL,
  "recipient_address" varchar(42) NOT NULL,
  "amount" bigint NOT NULL,
  "chain_id" integer NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "payment_tx_hash" varchar(66),
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "payment_intents_payment_tx_hash_unique" UNIQUE("payment_tx_hash")
);
--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_proxy_id_api_proxies_id_fk" FOREIGN KEY ("proxy_id") REFERENCES "public"."api_proxies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_payment_intents_proxy" ON "payment_intents" USING btree ("proxy_id");
--> statement-breakpoint
CREATE INDEX "idx_payment_intents_session" ON "payment_intents" USING btree ("session_id");
