ALTER TABLE "users" ADD COLUMN "avatar" varchar(500);--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cost_price" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "discount_percentage" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;