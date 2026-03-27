import apiClient from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import type { PurchaseRequest, PurchaseResponse } from "@/api/types/order";

export async function purchaseNow(payload: PurchaseRequest): Promise<PurchaseResponse> {
  const response = await apiClient.post<PurchaseResponse>(ENDPOINTS.PURCHASE, payload);
  return response.data;
}

