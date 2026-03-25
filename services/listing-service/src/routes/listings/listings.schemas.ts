import { z } from "@hono/zod-openapi";
import { listingStatusEnum, selectListingsSchema } from "@/db/schema";

const listingOptionalFieldsSchema = z.object({
  name: z.string().max(255).optional(),
  description: z.string().optional(),
  qty: z.coerce.number().int().nonnegative().optional(),
  unitPriceCents: z.coerce.number().int().nonnegative().optional(),
  bestBefore: z.coerce.date().optional(),
  status: z.enum(listingStatusEnum.enumValues).optional(),
});

export const listListingsQuerySchema = z.object({
  status: z.enum(listingStatusEnum.enumValues).optional(),
});

export const listListingsResponseSchema = z.array(selectListingsSchema);

export const createListingsRequestSchema = z.object({
  imageUrls: z.array(z.url()).min(1).max(50),
});

export const createListingsResponseSchema = z.array(selectListingsSchema);

export const patchListingBodySchema = listingOptionalFieldsSchema.extend({
  imageUrl: z.url().optional(),
});

export const purchaseListingBodySchema = z.object({
  qty: z.coerce.number().int().positive(),
});
