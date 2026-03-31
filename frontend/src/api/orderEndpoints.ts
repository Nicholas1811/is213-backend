import apiClient from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import type { ApiUserOrderItem, ApiUserOrdersResponse, Order } from "@/api/types/order";

function normalizeOrderStatus(status: string): Order["status"] {
  const normalized = status.toLowerCase();

  if (normalized === "confirmed" || normalized === "paid") return "confirmed";
  if (normalized === "completed" || normalized === "delivered") return "completed";
  if (normalized === "cancelled" || normalized === "canceled" || normalized === "failed") {
    return "cancelled";
  }
  return "pending";
}

function toOrder(item: ApiUserOrderItem, fallbackUserId: string): Order {
  const quantity = Number(item.qty) > 0 ? Number(item.qty) : 1;
  const total = Number(item.total_paid) || 0;

  return {
    id: String(item.id),
    buyerId: item.user_id || fallbackUserId,
    items: [
      {
        listingId: String(item.listing_id),
        listingName: `Listing #${item.listing_id}`,
        quantity,
        unitPrice: total / quantity,
        imageUrl: "",
      },
    ],
    subtotal: total,
    pointsRedeemed: 0,
    discount: 0,
    total,
    status: normalizeOrderStatus(item.status),
    pointsEarned: 0,
    createdAt: item.created_at,
    updatedAt: item.created_at,
  };
}

export async function getOrdersByUser(userId: string): Promise<Order[]> {
  const { data } = await apiClient.get<ApiUserOrdersResponse>(ENDPOINTS.ORDERS_BY_USER(userId));
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((item) => toOrder(item, data.userId || userId));
}

