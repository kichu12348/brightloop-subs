import type {
  ProductDetail,
  CreateProductBody,
  Plan,
  CreatePlanBody,
  Tax,
  CreateTaxBody,
  Discount,
  CreateDiscountBody,
  QuotationTemplateDetail,
  CreateQuotationTemplateBody,
  PaginatedResponse,
} from "@brightloop/shared";
import { apiRequest } from "../../lib/apiClient.ts";

export const catalogApi = {
  listProducts: (): Promise<PaginatedResponse<ProductDetail>> =>
    apiRequest<PaginatedResponse<ProductDetail>>("/api/products?pageSize=100", {
      method: "GET",
    }),

  createProduct: (body: CreateProductBody): Promise<ProductDetail> =>
    apiRequest<ProductDetail>("/api/products", {
      method: "POST",
      body,
    }),

  listPlans: (): Promise<PaginatedResponse<Plan>> =>
    apiRequest<PaginatedResponse<Plan>>("/api/plans?pageSize=100", {
      method: "GET",
    }),

  createPlan: (body: CreatePlanBody): Promise<Plan> =>
    apiRequest<Plan>("/api/plans", {
      method: "POST",
      body,
    }),

  listTaxes: (): Promise<PaginatedResponse<Tax>> =>
    apiRequest<PaginatedResponse<Tax>>("/api/taxes?pageSize=100", {
      method: "GET",
    }),

  createTax: (body: CreateTaxBody): Promise<Tax> =>
    apiRequest<Tax>("/api/taxes", {
      method: "POST",
      body,
    }),

  listDiscounts: (): Promise<PaginatedResponse<Discount>> =>
    apiRequest<PaginatedResponse<Discount>>("/api/discounts?pageSize=100", {
      method: "GET",
    }),

  createDiscount: (body: CreateDiscountBody): Promise<Discount> =>
    apiRequest<Discount>("/api/discounts", {
      method: "POST",
      body,
    }),

  listTemplates: (): Promise<PaginatedResponse<QuotationTemplateDetail>> =>
    apiRequest<PaginatedResponse<QuotationTemplateDetail>>("/api/quotation-templates?pageSize=100", {
      method: "GET",
    }),

  createTemplate: (body: CreateQuotationTemplateBody): Promise<QuotationTemplateDetail> =>
    apiRequest<QuotationTemplateDetail>("/api/quotation-templates", {
      method: "POST",
      body,
    }),
};

