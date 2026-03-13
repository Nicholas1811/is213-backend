import type { UploadUrlResult } from "@/lib/s3/presign";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import db from "@/db";
import { listings } from "@/db/schema";
import { createListingUploadUrl } from "@/lib/s3/presign";

type ListingRow = typeof listings.$inferSelect;
type ListingInsert = typeof listings.$inferInsert;
type ListingStatus = ListingRow["status"];

interface CreateUploadUrlInput {
  filename: string;
  contentType: string;
}

export interface ListingUploadIntentInput {
  filename: string;
  contentType: string;
  name?: string;
  description?: string;
  qty?: number;
  unitPriceCents?: number;
  bestBefore?: Date;
  status?: ListingStatus;
}

export interface ListingUploadIntentResult {
  listing: ListingRow;
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
  expiresIn: number;
}

export class ListingNotFoundError extends Error {
  constructor(message = "Listing not found") {
    super(message);
    this.name = "ListingNotFoundError";
  }
}

export type ListingConflictKind = "purchase_not_allowed" | "restock_not_allowed";

export class ListingConflictError extends Error {
  readonly kind: ListingConflictKind;

  constructor(kind: ListingConflictKind) {
    const message = kind === "purchase_not_allowed"
      ? "Listing does not have enough quantity or not active"
      : "Listing is neither active nor sold_out";
    super(message);
    this.name = "ListingConflictError";
    this.kind = kind;
  }
}

export async function listListings(status?: ListingStatus): Promise<ListingRow[]> {
  if (!status) {
    return db.select().from(listings);
  }

  return db.select()
    .from(listings)
    .where(eq(listings.status, status));
}

export async function createListing(listing: ListingInsert): Promise<ListingRow> {
  const [inserted] = await db.insert(listings)
    .values(listing)
    .returning();

  return inserted;
}

export async function createUploadUrl(input: CreateUploadUrlInput): Promise<UploadUrlResult> {
  return createListingUploadUrl(input);
}

export async function createListingsWithUploadUrls(inputs: ListingUploadIntentInput[]): Promise<ListingUploadIntentResult[]> {
  const results: ListingUploadIntentResult[] = [];

  for (const input of inputs) {
    const upload = await createListingUploadUrl({
      filename: input.filename,
      contentType: input.contentType,
    });

    const listing = await createListing({
      s3ImageUrl: upload.publicUrl,
      name: input.name,
      description: input.description,
      qty: input.qty,
      unitPriceCents: input.unitPriceCents,
      bestBefore: input.bestBefore,
      status: input.status,
    });

    results.push({
      listing,
      uploadUrl: upload.uploadUrl,
      publicUrl: upload.publicUrl,
      objectKey: upload.objectKey,
      expiresIn: upload.expiresIn,
    });
  }

  return results;
}

export async function getListingById(id: number): Promise<ListingRow | null> {
  const listing = await db.query.listings.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  return listing ?? null;
}

export async function getListingsByIds(ids: number[]): Promise<ListingRow[]> {
  if (ids.length === 0) {
    return [];
  }

  return db.select()
    .from(listings)
    .where(inArray(listings.id, ids));
}

export async function patchListing(id: number, updates: Partial<ListingInsert>): Promise<ListingRow | null> {
  const [updated] = await db.update(listings)
    .set(updates)
    .where(eq(listings.id, id))
    .returning();

  return updated ?? null;
}

export async function removeListing(id: number): Promise<boolean> {
  const result = await db.delete(listings)
    .where(eq(listings.id, id));

  return (result.rowCount ?? 0) > 0;
}

export async function purchaseListing(id: number, qty: number): Promise<ListingRow> {
  const purchasedListing = await db.transaction(async (tx) => {
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

    if (!updated) {
      return null;
    }

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

  if (purchasedListing) {
    return purchasedListing;
  }

  const existingListing = await getListingById(id);
  if (!existingListing) {
    throw new ListingNotFoundError();
  }

  throw new ListingConflictError("purchase_not_allowed");
}

export async function restockListing(id: number, qty: number): Promise<ListingRow> {
  const restockedListing = await db.transaction(async (tx) => {
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

    if (!updated) {
      return null;
    }

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

  if (restockedListing) {
    return restockedListing;
  }

  const existingListing = await getListingById(id);
  if (!existingListing) {
    throw new ListingNotFoundError();
  }

  throw new ListingConflictError("restock_not_allowed");
}

export async function cancelListing(id: number): Promise<ListingRow | null> {
  const [cancelledListing] = await db.update(listings)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(listings.id, id))
    .returning();

  return cancelledListing ?? null;
}

export async function syncListingFromEvent(snapshot: ListingRow): Promise<ListingRow | null> {
  const [updated] = await db.update(listings)
    .set({
      s3ImageUrl: snapshot.s3ImageUrl,
      name: snapshot.name,
      description: snapshot.description,
      qty: snapshot.qty,
      unitPriceCents: snapshot.unitPriceCents,
      status: snapshot.status,
      bestBefore: snapshot.bestBefore,
      updatedAt: new Date(),
    })
    .where(eq(listings.id, snapshot.id))
    .returning();

  return updated ?? null;
}
