import { create } from "zustand";

interface PointsState {
  balance: number;
  setBalance: (balance: number) => void;
  addPoints: (amount: number) => void;
}

export const usePointsStore = create<PointsState>()((set, get) => ({
  balance: 0,
  setBalance: (balance) => set({ balance }),
  addPoints: (amount) => set({ balance: get().balance + amount }),
}));
