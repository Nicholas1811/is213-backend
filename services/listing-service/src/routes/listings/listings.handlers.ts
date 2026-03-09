import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from "./listings.routes";
import type { AppRouteHandler } from "@/lib/types";
import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import db from "@/db";
import { listings } from "@/db/schema";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const listings = await db.query.listings.findMany();
  return c.json(listings);
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
