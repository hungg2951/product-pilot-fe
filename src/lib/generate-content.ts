import { axiosInstance } from "./axios";

export interface GeneratedProductContent {
  description: string;
  metaDescription: string;
  shortDescription: string;
}

export async function generateProductContent(
  productId: string,
  title: string,
): Promise<GeneratedProductContent> {
  const response = await axiosInstance.post(
    `/products/${encodeURIComponent(productId)}/generate-content`,
    { title },
  );
  return response.data;
}
