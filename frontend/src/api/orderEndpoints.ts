import apiClient from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import type { ApiUserOrderItem, ApiUserOrdersResponse } from "@/api/types/order";

export async function getOrdersByUser(userId: string): Promise<ApiUserOrderItem[]> {
  const { data } = await apiClient.get<ApiUserOrdersResponse>(ENDPOINTS.ORDERS_BY_USER(userId));
  return Array.isArray(data.items) ? data.items : [];
}

export async function cancelOrder(orderId: string): Promise<void> {
  await apiClient.put(ENDPOINTS.CANCEL_ORDER(orderId));
}

export async function deleteOrder(orderId: string): Promise<void> {
  await apiClient.delete(ENDPOINTS.DELETE_ORDER(orderId));
}
