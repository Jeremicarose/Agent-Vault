CREATE TABLE "payment_settlements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tx_hash" varchar(66) NOT NULL,
  "proxy_id" uuid NOT NULL,
  "token_address" varchar(42) NOT NULL,
  "recipient_address" varchar(42) NOT NULL,
  "payer_address" varchar(42) NOT NULL,
  "amount" bigint NOT NULL,
  "chain_id" integer NOT NULL,
  "settled_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "payment_settlements_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
ALTER TABLE "payment_settlements" ADD CONSTRAINT "payment_settlements_proxy_id_api_proxies_id_fk" FOREIGN KEY ("proxy_id") REFERENCES "public"."api_proxies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_payment_settlements_proxy" ON "payment_settlements" USING btree ("proxy_id");
