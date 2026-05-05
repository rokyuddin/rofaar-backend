import { pgTable, uuid, varchar, numeric, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const shippingZones = pgTable('shipping_zones', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(), // e.g., "Inside Dhaka", "Outside Dhaka"
    description: varchar('description', { length: 255 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const shippingMethods = pgTable('shipping_methods', {
    id: uuid('id').primaryKey().defaultRandom(),
    zoneId: uuid('zone_id').notNull().references(() => shippingZones.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(), // e.g., "Standard", "Express"
    cost: numeric('cost', { precision: 10, scale: 2 }).notNull(),
    estimatedDays: varchar('estimated_days', { length: 50 }), // e.g., "2-3 days"
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const shippingZonesRelations = relations(shippingZones, ({ many }) => ({
    methods: many(shippingMethods),
}));

export const shippingMethodsRelations = relations(shippingMethods, ({ one }) => ({
    zone: one(shippingZones, {
        fields: [shippingMethods.zoneId],
        references: [shippingZones.id],
    }),
}));
