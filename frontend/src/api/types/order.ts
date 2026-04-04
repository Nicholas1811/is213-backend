export interface Order {
  id: string;
  buyerId: string;
  items: OrderItem[];
  subtotal: number;
  pointsRedeemed: number;
  discount: number;
  total: number;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "refund_pending" | "refunded";
  pointsEarned: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  listingId: string;
  listingName: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
}

export interface CreateOrderRequest {
  items: {
    listingId: string;
    quantity: number;
  }[];
  pointsToRedeem: number;
}

export interface PurchaseRequest {
  listing_id: number;
  user_id: string;
  quantity: number;
  points: number;
}

export interface PurchaseStatusResponse {
  status: string;
}

export interface PurchaseCheckoutResponse {
  checkout_url: string;
  checkout_id: string;
}

export type PurchaseResponse = PurchaseStatusResponse | PurchaseCheckoutResponse;

export interface ApiUserOrderItem {
  id: string | number;
  userId: string;
  listingId: string | number;
  status: string;
  totalPaid: number;
  pointId?: string | number | null;
  paymentId?: string | number | null;
  qty: number;
  created_at: string;
}

export interface ApiUserOrdersResponse {
  userId: string;
  items: ApiUserOrderItem[];
}
