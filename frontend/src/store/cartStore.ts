import { create } from "zustand";
import { persist } from "zustand/middleware";
import { POINTS_TO_DOLLAR_RATIO } from "@/lib/constants";

export interface CartItem {
  listingId: string;
  name: string;
  imageUrl: string;
  unitPrice: number;
  originalPrice: number;
  quantity: number;
  maxQuantity: number;
}

interface CartState {
  items: CartItem[];
  pointsToRedeem: number;

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (listingId: string) => void;
  updateQuantity: (listingId: string, quantity: number) => void;
  setPointsToRedeem: (points: number) => void;
  clearCart: () => void;

  // Computed-like helpers
  getSubtotal: () => number;
  getDiscount: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      pointsToRedeem: 0,

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.listingId === item.listingId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.listingId === item.listingId
                  ? {
                      ...i,
                      quantity: Math.min(
                        i.quantity + item.quantity,
                        i.maxQuantity
                      ),
                    }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),

      removeItem: (listingId) =>
        set((state) => ({
          items: state.items.filter((i) => i.listingId !== listingId),
        })),

      updateQuantity: (listingId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.listingId === listingId
              ? { ...i, quantity: Math.min(Math.max(1, quantity), i.maxQuantity) }
              : i
          ),
        })),

      setPointsToRedeem: (points) => set({ pointsToRedeem: points }),

      clearCart: () => set({ items: [], pointsToRedeem: 0 }),

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0
        );
      },

      getDiscount: () => {
        const points = get().pointsToRedeem;
        return points / POINTS_TO_DOLLAR_RATIO;
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscount();
        return Math.max(0, subtotal - discount);
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: "jms-cart",
    }
  )
);
