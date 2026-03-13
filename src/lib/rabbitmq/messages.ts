import { z } from "zod";
import { selectListingsSchema } from "@/db/schema";

export const listingEventNameSchema = z.enum([
  "listing.uploaded", // After listing image is uploaded to S3 -> AI will consume to process the listing
  "listing.processed", // After AI finish processing, listing will consume to update listing information
  "listing.purchased", // After listing is purchased, notification will consume to alert company
  "listing.restocked", // After listing is restocked, notification will consume to alert company
  "listing.cancelled", // After listing is cancelled, notification will consume to alert customers
]);

export type ListingEventName = z.infer<typeof listingEventNameSchema>;

const dateInputSchema = z.union([
  z.date(),
  z.iso.datetime().transform(value => new Date(value)),
]);

export const listingSnapshotSchema = selectListingsSchema.extend({
  bestBefore: dateInputSchema.nullable(),
  createdAt: dateInputSchema,
  updatedAt: dateInputSchema,
});

export const listingEventSchema = z.object({
  eventId: z.uuid(),
  eventName: listingEventNameSchema,
  eventVersion: z.literal(1),
  occurredAt: z.iso.datetime(),
  source: z.literal("jms-productservice"),
  correlationId: z.string().min(1).optional(),
  data: listingSnapshotSchema,
});

export type ListingEvent = z.infer<typeof listingEventSchema>;

interface CreateListingEventInput {
  eventName: ListingEventName;
  data: z.infer<typeof listingSnapshotSchema>;
  correlationId?: string;
}

export function createListingEvent(input: CreateListingEventInput): ListingEvent {
  return listingEventSchema.parse({
    eventId: crypto.randomUUID(),
    eventName: input.eventName,
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    source: "jms-productservice",
    correlationId: input.correlationId,
    data: input.data,
  });
}
