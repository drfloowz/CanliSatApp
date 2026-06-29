import { create } from 'zustand';

interface BidState {
  bidsByProduct: Record<string, number>;
  setCurrentBid: (productId: string, amount: number) => void;
}

export const useBidStore = create<BidState>((set) => ({
  bidsByProduct: {},
  setCurrentBid: (productId, amount) => 
    set((state) => ({
      bidsByProduct: {
        ...state.bidsByProduct,
        [productId]: amount
      }
    })),
}));
