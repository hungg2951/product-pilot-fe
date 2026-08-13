import { axiosInstance } from '../axios'

export interface Shop {
  id: string
  name: string
  description: string | null
  id_shopify: string
  client_id: string
  secret_key: string
  default_prompt_template_id?: string | null
  created_at: string
  updated_at: string
}

export interface CreateShopInput {
  name: string
  description?: string
  id_shopify: string
  client_id: string
  secret_key: string
}

export interface UpdateShopInput {
  name?: string
  description?: string
  id_shopify?: string
  client_id?: string
  secret_key?: string
  default_prompt_template_id?: string | null
}

export const shopsApi = {
  async getShops(): Promise<Shop[]> {
    const response = await axiosInstance.get('/shops')
    return response.data
  },

  async getShop(id: string): Promise<Shop> {
    const response = await axiosInstance.get(`/shops/${id}`)
    return response.data
  },

  async createShop(input: CreateShopInput): Promise<Shop> {
    const response = await axiosInstance.post('/shops', input)
    return response.data
  },

  async updateShop(id: string, input: UpdateShopInput): Promise<Shop> {
    const response = await axiosInstance.patch(`/shops/${id}`, input)
    return response.data
  },

  async deleteShop(id: string): Promise<{ id: string; deleted: true }> {
    const response = await axiosInstance.delete(`/shops/${id}`)
    return response.data
  },
}
