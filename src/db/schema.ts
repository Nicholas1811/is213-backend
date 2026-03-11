import { z } from "@hono/zod-openapi";
import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Normal status flow
// created -> processed -> active -> sold_out/cancelled
export const listingStatusEnum = pgEnum("listing_status", [
  "created", // Default
  "processed", // AI processed
  "active", // Customers can see
  "cancelled", // Company cancels listing
  "sold_out", // Qty reaches 0
]);

export const listingStatusEnumSchema = z.object({
  status: z.enum(listingStatusEnum.enumValues),
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const listings = pgTable("listings", {
  id: integer("id")
    .generatedAlwaysAsIdentity()
    .primaryKey(),
  s3ImageUrl: text("s3_image_url"),
  name: varchar("name", { length: 255 }),
  description: text("description"),
  qty: integer("qty")
    .default(0),
  unitPriceCents: integer("unit_price_cents"),
  status: listingStatusEnum("status")
    .notNull()
    .default("created"),
  bestBefore: timestamp("best_before", { withTimezone: true })
    .defaultNow(),
  ...timestamps,
});

export const selectListingsSchema = createSelectSchema(listings);

export const insertListingsSchema = createInsertSchema(listings)
  .omit({
    s3ImageUrl: true,
    name: true,
    description: true,
    qty: true,
    unitPriceCents: true,
    bestBefore: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  });

export const patchListingsSchema = insertListingsSchema.partial();

export const purchaseListingsSchema = z.object({
  qty: z.coerce.number().int().positive(),
});
