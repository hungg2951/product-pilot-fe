export { productsApi } from './products'
export type {
  Product,
  ProductImage,
  ProductsResponse,
  ProductsPageInfo,
  UpdateProductPayload,
} from './products'

export { shopsApi } from './shops'
export type {
  Shop,
  CreateShopInput,
  UpdateShopInput,
} from './shops'

export { promptTemplatesApi } from './prompt-templates'
export type {
  PromptTemplate,
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
} from './prompt-templates'

export { authApi } from './auth'
export type {
  LoginPayload,
  LoginResponse,
  RefreshResponse,
  LogoutResponse,
} from './auth'

