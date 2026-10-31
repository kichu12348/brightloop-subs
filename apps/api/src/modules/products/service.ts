import type {
  CreateProductBody,
  UpdateProductBody,
  PaginationQuery,
  PaginatedResponse,
} from "@brightloop/shared";
import { ErrorCode } from "@brightloop/shared";
import { AppError } from "../../errors/appError.ts";
import type { Clock } from "../../lib/clock.ts";
import type {
  ProductsRepository,
  ProductDetailRecord,
  CreateVariantData,
} from "./repository.ts";

export interface ProductsServiceDependencies {
  repository: ProductsRepository;
  clock: Clock;
}

export interface ProductsService {
  createProduct(input: CreateProductBody): Promise<ProductDetailRecord>;
  getProductById(id: string): Promise<ProductDetailRecord>;
  updateProduct(
    id: string,
    input: UpdateProductBody,
  ): Promise<ProductDetailRecord>;
  deleteProduct(id: string): Promise<void>;
  listProducts(
    query: PaginationQuery,
  ): Promise<PaginatedResponse<ProductDetailRecord>>;
}

export function createProductsService(
  deps: ProductsServiceDependencies,
): ProductsService {
  return {
    async createProduct(
      input: CreateProductBody,
    ): Promise<ProductDetailRecord> {
      const now = deps.clock.nowMs();
      const productId = crypto.randomUUID();

      const variants: CreateVariantData[] = input.variants.map((v) => ({
        id: crypto.randomUUID(),
        productId,
        attributeName: v.attributeName.trim(),
        attributeValue: v.attributeValue.trim(),
        extraPricePaise: v.extraPricePaise,
        createdAt: now,
        updatedAt: now,
      }));

      return deps.repository.createProduct(
        {
          id: productId,
          name: input.name.trim(),
          type: input.type,
          salesPricePaise: input.salesPricePaise,
          costPricePaise: input.costPricePaise,
          notes: input.notes ?? null,
          createdAt: now,
          updatedAt: now,
        },
        variants,
      );
    },

    async getProductById(id: string): Promise<ProductDetailRecord> {
      const product = await deps.repository.findProductById(id);
      if (!product) {
        throw new AppError(ErrorCode.NotFound, "Product not found", 404);
      }
      return product;
    },

    async updateProduct(
      id: string,
      input: UpdateProductBody,
    ): Promise<ProductDetailRecord> {
      const now = deps.clock.nowMs();
      const variants: CreateVariantData[] | undefined = input.variants
        ? input.variants.map((v) => ({
            id: crypto.randomUUID(),
            productId: id,
            attributeName: v.attributeName.trim(),
            attributeValue: v.attributeValue.trim(),
            extraPricePaise: v.extraPricePaise,
            createdAt: now,
            updatedAt: now,
          }))
        : undefined;

      const updated = await deps.repository.updateProduct(
        id,
        {
          name: input.name?.trim(),
          type: input.type,
          salesPricePaise: input.salesPricePaise,
          costPricePaise: input.costPricePaise,
          notes: input.notes,
          updatedAt: now,
        },
        variants,
      );

      if (!updated) {
        throw new AppError(ErrorCode.NotFound, "Product not found", 404);
      }

      return updated;
    },

    async deleteProduct(id: string): Promise<void> {
      const now = deps.clock.nowMs();
      const deleted = await deps.repository.softDeleteProduct(id, now);
      if (!deleted) {
        throw new AppError(ErrorCode.NotFound, "Product not found", 404);
      }
    },

    async listProducts(
      query: PaginationQuery,
    ): Promise<PaginatedResponse<ProductDetailRecord>> {
      const page = query.page ?? 1;
      const pageSize = Math.min(query.pageSize ?? 20, 100);
      const offset = (page - 1) * pageSize;

      const { items, total } = await deps.repository.listProducts(
        pageSize,
        offset,
      );

      return {
        items,
        total,
        page,
        pageSize,
      };
    },
  };
}

