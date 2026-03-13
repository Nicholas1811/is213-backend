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

export const insertListingBodySchema = listingOptionalFieldsSchema.extend({
  s3ImageUrl: z.url(),
});

export const patchListingBodySchema = insertListingBodySchema.partial();

export const purchaseListingBodySchema = z.object({
  qty: z.coerce.number().int().positive(),
});

export const uploadUrlRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(120),
});

export const uploadUrlResponseSchema = z.object({
  uploadUrl: z.url(),
  publicUrl: z.url(),
  objectKey: z.string().min(1),
  expiresIn: z.coerce.number().int().positive(),
});

export const uploadUrlsRequestItemSchema = listingOptionalFieldsSchema.extend({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(120),
});

export const uploadUrlsRequestSchema = z.object({
  items: z.array(uploadUrlsRequestItemSchema).min(1).max(50),
});

export const uploadUrlsResponseItemSchema = z.object({
  listing: selectListingsSchema,
  uploadUrl: z.url(),
  publicUrl: z.url(),
  objectKey: z.string().min(1),
  expiresIn: z.coerce.number().int().positive(),
});

export const uploadUrlsResponseSchema = z.object({
  items: z.array(uploadUrlsResponseItemSchema),
});

export const completeUploadsRequestSchema = z.object({
  listingIds: z.array(z.coerce.number().int().positive()).min(1).max(200),
});

export const completeUploadsResponseSchema = z.object({
  requested: z.coerce.number().int().nonnegative(),
  publishedIds: z.array(z.coerce.number().int().positive()),
  failedIds: z.array(z.coerce.number().int().positive()),
  notFoundIds: z.array(z.coerce.number().int().positive()),
});
