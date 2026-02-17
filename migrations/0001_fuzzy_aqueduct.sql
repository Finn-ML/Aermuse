CREATE TABLE "email_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"preview_text" text,
	"status" text DEFAULT 'draft',
	"scheduled_for" timestamp,
	"sent_at" timestamp,
	"recipient_count" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_link_clicks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"send_id" varchar NOT NULL,
	"url" text NOT NULL,
	"clicked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_sends" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"subscriber_id" varchar NOT NULL,
	"postmark_message_id" varchar,
	"status" text DEFAULT 'queued',
	"sent_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "mailing_list_subscribers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"landing_page_id" varchar NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"status" text DEFAULT 'pending',
	"confirmation_token" varchar(64),
	"subscribed_at" timestamp,
	"unsubscribed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "merch_order_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"variant_id" varchar,
	"product_name" text NOT NULL,
	"variant_name" text,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"total" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "merch_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" varchar NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"customer_email" text NOT NULL,
	"customer_name" text,
	"shipping_address" jsonb,
	"subtotal" integer NOT NULL,
	"shipping_cost" integer DEFAULT 0,
	"platform_fee" integer DEFAULT 0,
	"total" integer NOT NULL,
	"currency" text DEFAULT 'gbp',
	"tracking_number" text,
	"tracking_url" text,
	"notes" text,
	"paid_at" timestamp,
	"shipped_at" timestamp,
	"delivered_at" timestamp,
	"refunded_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "merch_products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"landing_page_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'other' NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb,
	"base_price" integer NOT NULL,
	"currency" text DEFAULT 'gbp',
	"weight" integer,
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"stripe_product_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "merch_variants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"name" text NOT NULL,
	"size" text,
	"color" text,
	"sku" text,
	"price_override" integer,
	"inventory" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "landing_pages" ADD COLUMN "show_merch" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "preview_start_seconds" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_link_clicks" ADD CONSTRAINT "email_link_clicks_send_id_email_sends_id_fk" FOREIGN KEY ("send_id") REFERENCES "public"."email_sends"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_campaign_id_email_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_subscriber_id_mailing_list_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."mailing_list_subscribers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_list_subscribers" ADD CONSTRAINT "mailing_list_subscribers_landing_page_id_landing_pages_id_fk" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merch_order_items" ADD CONSTRAINT "merch_order_items_order_id_merch_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."merch_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merch_order_items" ADD CONSTRAINT "merch_order_items_product_id_merch_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."merch_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merch_order_items" ADD CONSTRAINT "merch_order_items_variant_id_merch_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."merch_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merch_orders" ADD CONSTRAINT "merch_orders_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merch_products" ADD CONSTRAINT "merch_products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merch_products" ADD CONSTRAINT "merch_products_landing_page_id_landing_pages_id_fk" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merch_variants" ADD CONSTRAINT "merch_variants_product_id_merch_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."merch_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mailing_list_subscribers_page_email_idx" ON "mailing_list_subscribers" USING btree ("landing_page_id","email");