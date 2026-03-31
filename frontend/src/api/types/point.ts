export interface PointsBalance {
  userId: string;
  balance: number;
}

export interface PointTransaction {
  id: string;
  userId: string;
  amount: number;
  type:
    | "EARN"
    | "REFUND"
    | "SPEND"
    | "earned_meal_photo"
    | "earned_order_complete"
    | "redeemed";
  description: string;
  createdAt: string;
}

export interface SubmitMealPhotosRequest {
  beforePhoto: Blob;
  afterPhoto: Blob;
}

export interface UploadBeforePhotoResponse {
  uploadId: string;
  status: "uploaded" | "failed";
  uploadedAt: string;
}

export interface SubmitMealPhotosResponse {
  status: "submitted" | "failed";
  pointsAwarded: number;
}

export interface RedeemPointsRequest {
  points: number;
  orderId: string;
}
