import type { CancelRoute, CreateRoute, GetOneRoute, ListRoute, PatchRoute, PurchaseRoute, RemoveRoute, RestockRoute } from "./listings.routes";
import type { AppRouteHandler } from "@/lib/types";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import db from "@/db";
import { listings, selectListingsSchema } from "@/db/schema";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { status } = c.req.valid("query");

  const filters = [];

  if (status) {
    filters.push(eq(listings.status, status));
  }

  const res = await db.select()
    .from(listings)
    .where(filters.length ? and(...filters) : undefined);

  return c.json(res, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const listing = c.req.valid("json");
  const [inserted] = await db.insert(listings).values(listing).returning();
  return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const listing = await db.query.listings.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

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

  const [listing] = await db.update(listings)
    .set(updates)
    .where(eq(listings.id, id))
    .returning();

  if (!listing) {
    return c.json({
      message: HttpStatusPhrases.NOT_FOUND,
    }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(listing, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const result = await db.delete(listings)
    .where(eq(listings.id, id));

  if (result.rowCount === 0) {
    return c.json({
      message: HttpStatusPhrases.NOT_FOUND,
    }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const purchase: AppRouteHandler<PurchaseRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { qty } = c.req.valid("json");

  // Start db transaction
  const purchasedListing = await db.transaction(async (tx) => {
    // Try update
    const [updated] = await tx.update(listings)
      .set({
        qty: sql`${listings.qty} - ${qty}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(listings.id, id),
          eq(listings.status, "active"),
          gte(listings.qty, qty),
        ),
      )
      .returning();

    // No updates or not enough qty
    if (!updated) {
      return null;
    }

    // After update and no more qty
    // Set status to sold out
    if (updated.qty === 0) {
      const [soldOutListing] = await tx.update(listings)
        .set({
          status: "sold_out",
          updatedAt: new Date(),
        })
        .where(eq(listings.id, id))
        .returning();

      return soldOutListing;
    }

    return updated;
  });

  // If nothing updated
  if (!purchasedListing) {
    // TODO: refactor here, move logic to listing.service.ts
    // Same as get one handler code
    const existingListing = await db.query.listings.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, id);
      },
    });

    if (!existingListing) {
      return c.json({
        message: HttpStatusPhrases.NOT_FOUND,
      }, HttpStatusCodes.NOT_FOUND);
    }

    return c.json({
      message: "Listing does not have enough quantity or not active",
    }, HttpStatusCodes.CONFLICT);
  }

  return c.json(purchasedListing, HttpStatusCodes.OK);
};

export const restock: AppRouteHandler<RestockRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { qty } = c.req.valid("json");

  // Start db transaction
  const restockedListing = await db.transaction(async (tx) => {
    // Try update
    const [updated] = await tx.update(listings)
      .set({
        qty: sql`${listings.qty} + ${qty}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(listings.id, id),
          inArray(listings.status, ["active", "sold_out"]),
        ),
      )
      .returning();

    // No listing found
    if (!updated) {
      return null;
    }

    // Check if trying to restock to sold_out listing
    if (updated.status === "sold_out") {
      const [addedToListing] = await tx.update(listings)
        .set({
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(listings.id, id))
        .returning();

      return addedToListing;
    }

    return updated;
  });

  if (!restockedListing) {
    // TODO: refactor here, move logic to listing.service.ts
    // Same as get one handler code
    const existingListing = await db.query.listings.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, id);
      },
    });

    if (!existingListing) {
      return c.json({
        message: HttpStatusPhrases.NOT_FOUND,
      }, HttpStatusCodes.NOT_FOUND);
    }

    return c.json({
      message: "Listing is neither active nor sold_out",
    }, HttpStatusCodes.CONFLICT);
  }

  return c.json(restockedListing, HttpStatusCodes.OK);
};

export const cancel: AppRouteHandler<CancelRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const [cancelledListing] = await db.update(listings)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(listings.id, id))
    .returning();

  if (!cancelledListing) {
    return c.json({
      message: HttpStatusPhrases.NOT_FOUND,
    }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(cancelledListing, HttpStatusCodes.OK);
};
