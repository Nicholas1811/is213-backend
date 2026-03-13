import type {
  CancelRoute,
  CompleteUploadsRoute,
  CreateRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  PurchaseRoute,
  RemoveRoute,
  RestockRoute,
  UploadUrlRoute,
  UploadUrlsRoute,
} from "./listings.routes";
import type { AppRouteHandler } from "@/lib/types";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { createListingEvent } from "@/lib/rabbitmq/messages";
import { publishListingEvent } from "@/lib/rabbitmq/publisher";
import { appLogger } from "@/middlewares/pino-logger";
import * as listingService from "@/services/listings.service";

const logger = appLogger.child({ module: "listings-handler" });

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { status } = c.req.valid("query");
  const res = await listingService.listListings(status);

  return c.json(res, HttpStatusCodes.OK);
};

export const uploadUrl: AppRouteHandler<UploadUrlRoute> = async (c) => {
  const input = c.req.valid("json");
  const payload = await listingService.createUploadUrl(input);

  return c.json(payload, HttpStatusCodes.OK);
};

export const uploadUrls: AppRouteHandler<UploadUrlsRoute> = async (c) => {
  const { items } = c.req.valid("json");
  const payload = await listingService.createListingsWithUploadUrls(items);

  return c.json({ items: payload }, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const listing = c.req.valid("json");
  const inserted = await listingService.createListing(listing);

  const event = createListingEvent({
    eventName: "listing.uploaded",
    data: inserted,
  });
  const published = await publishListingEvent(event);

  if (!published) {
    logger.warn({
      listingId: inserted.id,
      eventName: event.eventName,
    }, "Listing created but event publish failed");
  }

  return c.json(inserted, HttpStatusCodes.OK);
};

export const completeUploads: AppRouteHandler<CompleteUploadsRoute> = async (c) => {
  const { listingIds } = c.req.valid("json");
  const uniqueListingIds = [...new Set(listingIds)];

  const existingListings = await listingService.getListingsByIds(uniqueListingIds);
  const listingById = new Map(existingListings.map(listing => [listing.id, listing]));

  const publishedIds: number[] = [];
  const failedIds: number[] = [];
  const notFoundIds: number[] = [];

  for (const listingId of uniqueListingIds) {
    const listing = listingById.get(listingId);
    if (!listing) {
      notFoundIds.push(listingId);
      continue;
    }

    const event = createListingEvent({
      eventName: "listing.uploaded",
      data: listing,
    });
    const published = await publishListingEvent(event);

    if (published) {
      publishedIds.push(listingId);
    }
    else {
      failedIds.push(listingId);
      logger.warn({
        listingId,
        eventName: event.eventName,
      }, "Listing upload completion confirmed but event publish failed");
    }
  }

  return c.json({
    requested: uniqueListingIds.length,
    publishedIds,
    failedIds,
    notFoundIds,
  }, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const listing = await listingService.getListingById(id);

  if (!listing) {
    return c.json({
      message: HttpStatusPhrases.NOT_FOUND,
    }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(listing, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");

  const listing = await listingService.patchListing(id, updates);

  if (!listing) {
    return c.json({
      message: HttpStatusPhrases.NOT_FOUND,
    }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(listing, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const removed = await listingService.removeListing(id);
  if (!removed) {
    return c.json({
      message: HttpStatusPhrases.NOT_FOUND,
    }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const purchase: AppRouteHandler<PurchaseRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { qty } = c.req.valid("json");

  try {
    const listing = await listingService.purchaseListing(id, qty);
    return c.json(listing, HttpStatusCodes.OK);
  }
  catch (error) {
    if (error instanceof listingService.ListingNotFoundError) {
      return c.json({
        message: HttpStatusPhrases.NOT_FOUND,
      }, HttpStatusCodes.NOT_FOUND);
    }

    if (error instanceof listingService.ListingConflictError) {
      return c.json({
        message: error.message,
      }, HttpStatusCodes.CONFLICT);
    }

    throw error;
  }
};

export const restock: AppRouteHandler<RestockRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { qty } = c.req.valid("json");

  try {
    const listing = await listingService.restockListing(id, qty);
    return c.json(listing, HttpStatusCodes.OK);
  }
  catch (error) {
    if (error instanceof listingService.ListingNotFoundError) {
      return c.json({
        message: HttpStatusPhrases.NOT_FOUND,
      }, HttpStatusCodes.NOT_FOUND);
    }

    if (error instanceof listingService.ListingConflictError) {
      return c.json({
        message: error.message,
      }, HttpStatusCodes.CONFLICT);
    }

    throw error;
  }
};

export const cancel: AppRouteHandler<CancelRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const cancelledListing = await listingService.cancelListing(id);

  if (!cancelledListing) {
    return c.json({
      message: HttpStatusPhrases.NOT_FOUND,
    }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(cancelledListing, HttpStatusCodes.OK);
};
