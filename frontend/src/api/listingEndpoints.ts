import apiClient from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import type { CreateListingRequest, Listing } from "@/api/types/listing";

export async function batchCreateListings(imageUrls: string[]): Promise<Listing[]> {
  const response = await apiClient.post<Listing[]>(ENDPOINTS.CREATE_LISTING, { imageUrls });
  return response.data;
}

export type ListingStatus = Listing["status"];

export interface GetListingsQuery {
  status?: ListingStatus;
}

export async function getListings(query?: GetListingsQuery): Promise<Listing[]> {
  const response = await apiClient.get<Listing[]>(ENDPOINTS.LISTINGS, {
    params: query,
  });
  return response.data;
}

export async function getActiveListings(): Promise<Listing[]> {
  return getListings({ status: "active" });
}

export async function getListingById(id: string): Promise<Listing> {
  const response = await apiClient.get<Listing>(ENDPOINTS.LISTING_BY_ID(id));
  return response.data;
}

export async function getMyListings(): Promise<Listing[]> {
  const response = await apiClient.get<Listing[]>(ENDPOINTS.MY_LISTINGS);
  return response.data;
}

export async function createListing(payload: CreateListingRequest): Promise<Listing> {
  const response = await apiClient.post<Listing>(ENDPOINTS.CREATE_LISTING, payload);
  return response.data;
}

export async function updateListing(
  id: string,
  payload: Partial<CreateListingRequest>
): Promise<Listing> {
  const response = await apiClient.put<Listing>(ENDPOINTS.UPDATE_LISTING(id), payload);
  return response.data;
}

export async function deleteListing(id: string): Promise<void> {
  await apiClient.delete(ENDPOINTS.DELETE_LISTING(id));
}

