export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "buyer" | "seller";
  createdAt: string;
}
