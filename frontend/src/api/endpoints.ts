// API endpoint constants
// Replace these placeholder URLs with your actual microservice endpoints

const API_GATEWAY_BASE = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8000";

export const ENDPOINTS = {
  // Listing / Inventory Service
  LISTINGS: `${API_GATEWAY_BASE}/listings`,
  LISTING_BY_ID: (id: string) => `${API_GATEWAY_BASE}/listings/${id}`,
  MY_LISTINGS: `${API_GATEWAY_BASE}/listings/mine`,
  CREATE_LISTING: `${API_GATEWAY_BASE}/listings`,
  UPDATE_LISTING: (id: string) => `${API_GATEWAY_BASE}/listings/${id}`,
  DELETE_LISTING: (id: string) => `${API_GATEWAY_BASE}/listings/${id}`,

  // AI-Assisted Listing (CreateListing-service)
  AI_CREATE_LISTINGS: `${API_GATEWAY_BASE}/listings/ai-create`,
  AI_LISTING_STATUS: (id: string) => `${API_GATEWAY_BASE}/listings/ai-status/${id}`,

  // Marketplace (for buyers browsing)
  MARKETPLACE: `${API_GATEWAY_BASE}/marketplace`,
  MARKETPLACE_LISTING: (id: string) => `${API_GATEWAY_BASE}/marketplace/${id}`,

  // Order Service
  ORDERS: `${API_GATEWAY_BASE}/orders`,
  ORDER_BY_ID: (id: string) => `${API_GATEWAY_BASE}/orders/${id}`,
  ORDERS_BY_USER: (userId: string) => `${API_GATEWAY_BASE}/orders/user/${encodeURIComponent(userId)}`,
  CREATE_ORDER: `${API_GATEWAY_BASE}/orders`,
  CANCEL_ORDER: (id: string) => `${API_GATEWAY_BASE}/orders/cancel/${id}`,
  DELETE_ORDER: (id: string) => `${API_GATEWAY_BASE}/orders/${id}`,

  // Points Service
  POINTS_BALANCE: `${API_GATEWAY_BASE}/points/balance`,
  POINTS_HISTORY: `${API_GATEWAY_BASE}/points/history`,
  POINTS_TRANSACTIONS_BY_USER: (userId: string) =>
    `${API_GATEWAY_BASE}/points/transaction/${encodeURIComponent(userId)}`,
  SUBMIT_MEAL_PHOTOS: `${API_GATEWAY_BASE}/points/meal-photos`,
  REDEEM_POINTS: `${API_GATEWAY_BASE}/points/redeem`,

  // Payment Service
  PAYMENTS: `${API_GATEWAY_BASE}/payments`,
  PURCHASE: `${API_GATEWAY_BASE}/purchases/purchase`,

  // Auth / User
  USER_PROFILE: `${API_GATEWAY_BASE}/user-auth/profile`,

  // Notifications
  NOTIFICATION_TOKENS: "https://personal-fsn5aajc.outsystemscloud.com/NotificationTokenService/rest/NotificationTokens/notificationtokens",
  USER_NOTIFICATIONS: (userId: string) =>
    `https://personal-fsn5aajc.outsystemscloud.com/NotificationService/rest/Notifications/usernotifications?userId=${encodeURIComponent(userId)}`,
} as const;
