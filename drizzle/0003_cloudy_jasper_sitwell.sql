-- ─── 0003_variants_and_dimensions ─────────────────────────────────────────────
-- Adds product variants, dimensions, free shipping, multi-warehouse inventory,
-- and category hierarchy. Includes backfill to generate default variants for
-- existing products and link existing cart/order items to them.

-- ─── A. Create new tables ─────────────────────────────────────────────────────

CREATE TABLE "product_attribute_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attribute_id" uuid NOT NULL,
	"value" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"metadata" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint

CREATE TABLE "product_attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint

CREATE TABLE "product_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"value" varchar(255) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint

CREATE TABLE "product_variant_attributes" (
	"variant_id" uuid NOT NULL,
	"attribute_value_id" uuid NOT NULL,
	CONSTRAINT "product_variant_attributes_variant_id_attribute_value_id_pk" PRIMARY KEY("variant_id","attribute_value_id")
);
--> statement-breakpoint

CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"sale_price" numeric(10, 2),
	"stock" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint

CREATE TABLE "product_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "warehouses_code_unique" UNIQUE("code")
);
--> statement-breakpoint

-- ─── B. Add new columns to existing tables (nullable first) ──────────────────

ALTER TABLE "categories" ADD COLUMN "parent_id" uuid;
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "path" varchar(500);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "status" varchar(20) DEFAULT 'published' NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "has_variants" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "free_shipping" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "weight" numeric(8, 3);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "length" numeric(8, 2);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "width" numeric(8, 2);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "height" numeric(8, 2);
--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "variant_id" uuid;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_id" uuid;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_sku" varchar(100);
--> statement-breakpoint
ALTER TABLE "inventory_logs" ADD COLUMN "variant_id" uuid;
--> statement-breakpoint
ALTER TABLE "inventory_logs" ADD COLUMN "warehouse_id" uuid;
--> statement-breakpoint

-- ─── C. Foreign keys for new columns (deferred so backfill can succeed) ───────

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- ─── D. Backfill: create default variant for every existing product ───────────

INSERT INTO "product_variants" ("product_id", "sku", "name", "base_price", "sale_price", "stock", "is_default", "is_active", "is_locked", "sort_order", "created_at", "updated_at")
SELECT
	p."id",
	CASE
		WHEN LENGTH(p."slug") <= 92 THEN p."slug" || '-DEFAULT'
		ELSE LEFT(p."slug", 79) || '-' || SUBSTRING(MD5(p."id"::text), 1, 12) || '-DEFAULT'
	END,
	'Default',
	COALESCE(p."price", '0'),
	NULL,
	COALESCE(p."stock", 0),
	true,
	true,
	true,
	0,
	now(),
	now()
FROM "products" p
WHERE NOT EXISTS (
	SELECT 1 FROM "product_variants" v WHERE v."product_id" = p."id" AND v."is_default" = true
);
--> statement-breakpoint

-- ─── E. Backfill: link existing cart_items to the product's default variant ───

UPDATE "cart_items" ci
SET "variant_id" = pv."id"
FROM "product_variants" pv
WHERE pv."product_id" = ci."product_id"
  AND pv."is_default" = true
  AND ci."variant_id" IS NULL;
--> statement-breakpoint

-- ─── F. Backfill: link existing order_items to the product's default variant ──

UPDATE "order_items" oi
SET
	"variant_id" = pv."id",
	"variant_name" = COALESCE(pv."name", 'Default'),
	"variant_sku" = pv."sku"
FROM "product_variants" pv
WHERE pv."product_id" = oi."product_id"
  AND pv."is_default" = true
  AND (oi."variant_id" IS NULL OR oi."variant_name" IS NULL OR oi."variant_sku" IS NULL);
--> statement-breakpoint

-- ─── G. Backfill: initialize category paths ───────────────────────────────────

UPDATE "categories" SET "path" = "name" WHERE "path" IS NULL;
--> statement-breakpoint

-- ─── H. Backfill: populate status from is_active for products ────────────────

UPDATE "products" SET "status" = CASE WHEN "is_active" = true THEN 'published' ELSE 'draft' END WHERE "status" IS NULL;
--> statement-breakpoint

-- ─── I. Now enforce NOT NULL on the columns that needed backfill ──────────────
-- order_items.variant_id stays NULLABLE so that the ON DELETE set null FK
-- can preserve order history if a variant is ever removed. variant_name and
-- variant_sku are NOT NULL snapshots that survive variant deletion.
-- All new orders MUST have a non-null variant_id (enforced in service layer).

ALTER TABLE "cart_items" ALTER COLUMN "variant_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "variant_name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "variant_sku" SET NOT NULL;
--> statement-breakpoint

-- ─── I.bis Category parent FK ─────────────────────────────────────────────────
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- ─── J. Foreign keys and indexes for new tables ──────────────────────────────

ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_id_product_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."product_attributes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_variant_attributes" ADD CONSTRAINT "product_variant_attributes_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_variant_attributes" ADD CONSTRAINT "product_variant_attributes_attribute_value_id_product_attribute_values_id_fk" FOREIGN KEY ("attribute_value_id") REFERENCES "public"."product_attribute_values"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- ─── K. Indexes ──────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX "uq_product_attribute_values_attr_slug" ON "product_attribute_values" USING btree ("attribute_id","slug");
--> statement-breakpoint
CREATE INDEX "product_attribute_values_attribute_id_idx" ON "product_attribute_values" USING btree ("attribute_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_attributes_product_slug" ON "product_attributes" USING btree ("product_id","slug");
--> statement-breakpoint
CREATE INDEX "product_attributes_product_id_idx" ON "product_attributes" USING btree ("product_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_specs_product_name" ON "product_specs" USING btree ("product_id","name");
--> statement-breakpoint
CREATE INDEX "product_specs_product_id_idx" ON "product_specs" USING btree ("product_id");
--> statement-breakpoint
CREATE INDEX "product_variant_attributes_attribute_value_id_idx" ON "product_variant_attributes" USING btree ("attribute_value_id");
--> statement-breakpoint
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_variants_default_per_product" ON "product_variants" USING btree ("product_id") WHERE is_default = true;
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_inventory_variant_warehouse" ON "product_inventory" USING btree ("variant_id","warehouse_id");
--> statement-breakpoint
CREATE INDEX "product_inventory_variant_id_idx" ON "product_inventory" USING btree ("variant_id");
--> statement-breakpoint
CREATE INDEX "product_inventory_warehouse_id_idx" ON "product_inventory" USING btree ("warehouse_id");
--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");
--> statement-breakpoint
CREATE INDEX "cart_items_user_variant_idx" ON "cart_items" USING btree ("user_id","variant_id");
