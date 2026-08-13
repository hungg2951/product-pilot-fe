import { axiosInstance } from '../axios'

export interface PromptTemplate {
  id: string
  name: string
  content: string
  created_at: string
  updated_at: string
}

export interface CreatePromptTemplateInput {
  name: string
  content: string
}

export interface UpdatePromptTemplateInput {
  name?: string
  content?: string
}

export const promptTemplatesApi = {
  async getPromptTemplates(): Promise<PromptTemplate[]> {
    const response = await axiosInstance.get('/prompt-templates')
    return response.data
  },

  async getPromptTemplate(id: string): Promise<PromptTemplate> {
    const response = await axiosInstance.get(`/prompt-templates/${id}`)
    return response.data
  },

  async createPromptTemplate(
    input: CreatePromptTemplateInput
  ): Promise<PromptTemplate> {
    const response = await axiosInstance.post('/prompt-templates', input)
    return response.data
  },

  async updatePromptTemplate(
    id: string,
    input: UpdatePromptTemplateInput
  ): Promise<PromptTemplate> {
    const response = await axiosInstance.patch(`/prompt-templates/${id}`, input)
    return response.data
  },

  async deletePromptTemplate(
    id: string
  ): Promise<{ id: string; deleted: true }> {
    const response = await axiosInstance.delete(`/prompt-templates/${id}`)
    return response.data
  },
}
