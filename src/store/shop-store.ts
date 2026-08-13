import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ShopState {
  activeShopId: string | null
  setActiveShop: (id: string | null) => void
  setActiveShopId: (id: string | null) => void
}

export const useShopStore = create<ShopState>()(
  persist(
    (set) => ({
      activeShopId: null,
      setActiveShop: (id) => set({ activeShopId: id }),
      setActiveShopId: (id) => set({ activeShopId: id }),
    }),
    {
      name: 'product-pilot-active-shop',
    }
  )
)
