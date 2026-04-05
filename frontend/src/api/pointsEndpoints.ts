import apiClient from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import type {
  PointTransaction,
  PointsBalance,
  SubmitMealPhotosRequest,
  SubmitMealPhotosResponse,
  UploadBeforePhotoResponse,
} from "@/api/types/point";
const USE_DUMMY_POINTS = import.meta.env.VITE_USE_DUMMY_POINTS !== "false";

interface ApiPointTransaction {
  transaction_id: string | number;
  points_changed: number;
  type: string;
  reference_id?: string | number | null;
  timestamp: string;
}

interface ApiPointsTransactionsResponse {
  user_id: string;
  transactions: ApiPointTransaction[];
}

const DUMMY_TRANSACTIONS: PointTransaction[] = [
  {
    id: "txn-1",
    userId: "temp-user-id",
    amount: 10,
    type: "EARN",
    description: "Meal photo submission",
    createdAt: "2026-03-30T09:15:00Z",
  },
  {
    id: "txn-2",
    userId: "temp-user-id",
    amount: 5,
    type: "EARN",
    description: "Order #1234 completed",
    createdAt: "2026-03-29T11:30:00Z",
  },
  {
    id: "txn-3",
    userId: "temp-user-id",
    amount: -25,
    type: "SPEND",
    description: "Redeemed during checkout",
    createdAt: "2026-03-28T14:05:00Z",
  },
  {
    id: "txn-4",
    userId: "temp-user-id",
    amount: 10,
    type: "EARN",
    description: "Meal photo submission",
    createdAt: "2026-03-27T18:45:00Z",
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function uploadBeforeMealPhoto(beforePhoto: Blob): Promise<UploadBeforePhotoResponse> {
  if (USE_DUMMY_POINTS) {
    await sleep(800);
    return {
      uploadId: `before-${Date.now()}`,
      status: "uploaded",
      uploadedAt: new Date().toISOString(),
    };
  }

  const formData = new FormData();
  formData.append("beforePhoto", beforePhoto, "before-photo.jpg");

  const { data } = await apiClient.post<UploadBeforePhotoResponse>(
    `${ENDPOINTS.SUBMIT_MEAL_PHOTOS}/before`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return data;
}

export async function submitMealPhotos(
  payload: SubmitMealPhotosRequest
): Promise<SubmitMealPhotosResponse> {
  if (USE_DUMMY_POINTS) {
    await sleep(1200);
    return {
      status: "submitted",
      pointsAwarded: 10,
    };
  }

  const formData = new FormData();
  formData.append("beforePhoto", payload.beforePhoto, "before-photo.jpg");
  formData.append("afterPhoto", payload.afterPhoto, "after-photo.jpg");

  const { data } = await apiClient.post<SubmitMealPhotosResponse>(
    ENDPOINTS.SUBMIT_MEAL_PHOTOS,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return data;
}

function mapTransactionType(type: string): PointTransaction["type"] {
  const normalized = type.toUpperCase();

  if (normalized === "EARN" || normalized === "EARNED_MEAL_PHOTO" || normalized === "EARNED_ORDER_COMPLETE") {
    return "EARN";
  }
  if (normalized === "REFUND") {
    return "REFUND";
  }
  if (normalized === "SPEND" || normalized === "REDEEMED") {
    return "SPEND";
  }

  return "EARN";
}

function toPointTransaction(userId: string, txn: ApiPointTransaction): PointTransaction {
  return {
    id: String(txn.transaction_id),
    userId,
    amount: Number(txn.points_changed) || 0,
    type: mapTransactionType(txn.type),
    description: txn.reference_id ? `Reference ${txn.reference_id}` : "Points transaction",
    createdAt: txn.timestamp,
  };
}

export async function getPointsHistory(userId: string): Promise<PointTransaction[]> {
  try {
    const { data } = await apiClient.get<ApiPointsTransactionsResponse>(
      ENDPOINTS.POINTS_TRANSACTIONS_BY_USER(userId)
    );

    return (data.transactions || []).map((txn) => toPointTransaction(data.user_id || userId, txn));
  } catch (error) {
    if (USE_DUMMY_POINTS) {
      await sleep(600);
      return DUMMY_TRANSACTIONS;
    }
    throw error;
  }
}

export async function createPhotoProcess(userID:string,  beforeImageUrl: string) {
    const payload = {
        user_id: userID,
        before_image_url: beforeImageUrl,
    };

    const res = await fetch("http://localhost:8000/points/photos/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        throw new Error("Failed to create photo process");
    }

    return res.json();
}
export async function uploadAfterMealPhoto(
    transactionId: string,
    afterImageUrl: string
) {
    const res = await fetch(
        `http://localhost:8000/points/photos/${transactionId}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                after_image_url: afterImageUrl,
            }),
        }
    );

    if (!res.ok) {
        throw new Error("Failed to upload after photo");
    }

    return res.json();
}
export async function getPhotoStatus(transactionId: string) {
    const res = await fetch(
        `http://localhost:8000/points/photos/${transactionId}/status`
    );

    if (!res.ok) throw new Error("Failed to fetch status");

    return res.json();
}

export async function getUserPointBalance(userID: string): Promise<PointsBalance> {
  const { data } = await apiClient.get<{ balance: number }>(
    `${ENDPOINTS.POINTS_BALANCE}/${encodeURIComponent(userID)}`
  );

  return {
    userId: userID,
    balance: Number(data.balance) || 0,
  };
}
