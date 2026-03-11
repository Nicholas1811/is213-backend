import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentOneOf, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";
import { insertListingsSchema, listingStatusEnum, patchListingsSchema, purchaseListingsSchema, selectListingsSchema } from "@/db/schema";
import { conflictSchema, notFoundSchema } from "@/lib/constants";

const tags = ["Listings"];

// Query schema for list listings
export const listListingsQuerySchema = z.object({
  status: z.enum(listingStatusEnum.enumValues).optional(),
});

export const list = createRoute({
  path: "/listings",
  method: "get",
  tags,
  request: {
    query: listListingsQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectListingsSchema),
      "The list of (filtered) listings",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertListingsSchema),
      "Validation error(s)",
    ),
  },
});

export const create = createRoute({
  path: "/listings",
  method: "post",
  request: {
    body: jsonContentRequired(
      insertListingsSchema,
      "The listing to create",
    ),
  },
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectListingsSchema,
      "The created listing",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertListingsSchema),
      "Validation error(s)",
    ),
  },
});

export const getOne = createRoute({
  path: "/listings/{id}",
  method: "get",
  request: {
    params: IdParamsSchema,
  },
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectListingsSchema,
      "The requested listing",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Listing not found",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdParamsSchema),
      "Invalid id error",
    ),
  },
});

export const patch = createRoute({
  path: "/listings/{id}",
  method: "patch",
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(
      patchListingsSchema,
      "The listing updates",
    ),
  },
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectListingsSchema,
      "The updated listing",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Listing not found",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
      [
        createErrorSchema(patchListingsSchema),
        createErrorSchema(IdParamsSchema),
      ],
      "Validation error(s)",
    ),
  },
});

export const remove = createRoute({
  path: "/listings/{id}",
  method: "delete",
  request: {
    params: IdParamsSchema,
  },
  tags,
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Listing deleted",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Listing not found",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdParamsSchema),
      "Invalid id error",
    ),
  },
});

export const purchase = createRoute({
  path: "/listings/{id}/purchase",
  method: "post",
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(
      purchaseListingsSchema,
      "The quantity to buy",
    ),
  },
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectListingsSchema,
      "The updated listing",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Listing not found",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      conflictSchema,
      "Listing does not have enough quantity or not active",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
      [
        createErrorSchema(purchaseListingsSchema),
        createErrorSchema(IdParamsSchema),
      ],
      "Validation error(s)",
    ),
  },
});

export const restock = createRoute({
  path: "/listings/{id}/restock",
  method: "post",
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(
      purchaseListingsSchema,
      "The quantity to restock",
    ),
  },
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectListingsSchema,
      "The updated listing",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Listing not found",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      conflictSchema,
      "Listing is neither active nor sold_out",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
      [
        createErrorSchema(purchaseListingsSchema),
        createErrorSchema(IdParamsSchema),
      ],
      "Validation error(s)",
    ),
  },
});

export const cancel = createRoute({
  path: "/listings/{id}/cancel",
  method: "post",
  request: {
    params: IdParamsSchema,
  },
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectListingsSchema,
      "The cancelled listing",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Listing not found",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdParamsSchema),
      "Invalid id error",
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type PurchaseRoute = typeof purchase;
export type RestockRoute = typeof restock;
export type CancelRoute = typeof cancel;
