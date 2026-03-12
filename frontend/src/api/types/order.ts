export interface Order {
  id: string;
  buyerId: string;
  items: OrderItem[];
  subtotal: number;
  pointsRedeemed: number;
  discount: number;
  total: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
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
