export interface Listing {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  category: string;
  originalPrice: number;
  discountedPrice: number;
  imageUrl: string;
  quantity: number;
  status: "draft" | "ai_processing" | "active" | "sold_out";
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingRequest {
  name: string;
  description: string;
  category: string;
  originalPrice: number;
  discountedPrice: number;
  imageUrl: string;
  quantity: number;
}

export interface AIListingRequest {
  images: File[];
  count: number;
}

export interface AIListingStatus {
  listingId: string;
  status: "pending" | "processing" | "complete" | "failed";
  listing?: Listing;
}
