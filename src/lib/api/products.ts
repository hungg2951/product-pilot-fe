import { axiosInstance } from "../axios";

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
}

export interface Product {
  id: string;
  title: string;
  status: string;
  vendor: string;
  createdAt: string;
  images: ProductImage[];
  description?: string;
  metaDescription?: string;
  shortDescription?: string;
}

export interface ProductsPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface ProductsResponse {
  products: Product[];
  pageInfo: ProductsPageInfo;
}

export interface UpdateProductPayload {
  description: string;
  metaDescription: string;
  shortDescription: string;
}

export const productsApi = {
  async getProducts(params?: {
    limit?: number;
    after?: string;
  }): Promise<ProductsResponse> {
    const response = await axiosInstance.get("/products", {
      params: {
        limit: params?.limit ?? 10,
        ...(params?.after ? { after: params.after } : {}),
      },
    });
    return response.data;
  },

  async updateProduct(
    id: string,
    data: UpdateProductPayload,
  ): Promise<Product> {
    const response = await axiosInstance.patch(
      `/products/${encodeURIComponent(id)}`,
      data,
    );
    return response.data;
  },

  async searchProduct(title: string): Promise<Product[]> {
    const response = await axiosInstance.get("/products/search", {
      params: { title },
    });
    return response.data;
  },

  async getProductImages(id: string): Promise<ProductImage[]> {
    const response = await axiosInstance.get(
      `/products/${encodeURIComponent(id)}/images`,
    );
    return response.data;
  },

  async uploadProductImage(id: string, file: File): Promise<ProductImage> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axiosInstance.post(
      `/products/${encodeURIComponent(id)}/images`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  async deleteProductImages(
    id: string,
    mediaIds: string[],
  ): Promise<{ deletedMediaIds: string[] }> {
    const response = await axiosInstance.delete(
      `/products/${encodeURIComponent(id)}/images`,
      { data: { mediaIds } },
    );
    return response.data;
  },
};
