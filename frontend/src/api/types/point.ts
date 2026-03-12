export interface PointsBalance {
  userId: string;
  balance: number;
}

export interface PointTransaction {
  id: string;
  userId: string;
  amount: number;
  type: "earned_meal_photo" | "earned_order_complete" | "redeemed";
  description: string;
  createdAt: string;
}

export interface SubmitMealPhotosRequest {
  beforePhoto: Blob;
  afterPhoto: Blob;
}

export interface RedeemPointsRequest {
  points: number;
  orderId: string;
}
