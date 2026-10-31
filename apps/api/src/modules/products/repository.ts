import { eq, and, isNull, inArray, count, desc } from "drizzle-orm";
import type { AppDatabase } from "../../db/client.ts";
import { products, productVariants } from "../../db/schema.ts";
import { ProductType } from "@brightloop/shared";

export interface ProductVariantRecord {
  id: string;
  productId: string;
  attributeName: string;
  attributeValue: string;
  extraPricePaise: number;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export interface ProductDetailRecord {
  id: string;
  name: string;
  type: ProductType;
  salesPricePaise: number;
  costPricePaise: number;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
  variants: ProductVariantRecord[];
}

export interface CreateProductData {
  id: string;
  name: string;
  type: ProductType;
  salesPricePaise: number;
  costPricePaise: number;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateVariantData {
  id: string;
  productId: string;
  attributeName: string;
  attributeValue: string;
  extraPricePaise: number;
  createdAt: number;
  updatedAt: number;
}

export interface UpdateProductData {
  name?: string | undefined;
  type?: ProductType | undefined;
  salesPricePaise?: number | undefined;
  costPricePaise?: number | undefined;
  notes?: string | null | undefined;
  updatedAt: number;
}

export interface ProductsRepository {
  createProduct(
    product: CreateProductData,
    variants: CreateVariantData[],
  ): Promise<ProductDetailRecord>;
  findProductById(id: string): Promise<ProductDetailRecord | null>;
  listProducts(
    limit: number,
    offset: number,
  ): Promise<{ items: ProductDetailRecord[]; total: number }>;
  updateProduct(
    id: string,
    updateData: UpdateProductData,
    variants?: CreateVariantData[] | undefined,
  ): Promise<ProductDetailRecord | null>;
  softDeleteProduct(id: string, nowMs: number): Promise<boolean>;
}

function parseProductType(type: string): ProductType {
  if (
    type === ProductType.Service ||
    type === ProductType.Consumable ||
    type === ProductType.Subscription
  ) {
    return type;
  }
  throw new Error(`Invalid product type: ${type}`);
}

export function createSqliteProductsRepository(
  database: AppDatabase,
): ProductsRepository {
  return {
    async createProduct(
      product: CreateProductData,
      variants: CreateVariantData[],
    ): Promise<ProductDetailRecord> {
      database.transaction((tx) => {
        tx.insert(products)
          .values({
            id: product.id,
            name: product.name,
            type: product.type,
            salesPricePaise: product.salesPricePaise,
            costPricePaise: product.costPricePaise,
            notes: product.notes,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
          })
          .run();

        for (const variant of variants) {
          tx.insert(productVariants)
            .values({
              id: variant.id,
              productId: variant.productId,
              attributeName: variant.attributeName,
              attributeValue: variant.attributeValue,
              extraPricePaise: variant.extraPricePaise,
              createdAt: variant.createdAt,
              updatedAt: variant.updatedAt,
            })
            .run();
        }
      });

      return {
        id: product.id,
        name: product.name,
        type: product.type,
        salesPricePaise: product.salesPricePaise,
        costPricePaise: product.costPricePaise,
        notes: product.notes,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        archivedAt: null,
        variants: variants.map((v) => ({
          ...v,
          archivedAt: null,
        })),
      };
    },

    async findProductById(id: string): Promise<ProductDetailRecord | null> {
      const productRow = database
        .select()
        .from(products)
        .where(and(eq(products.id, id), isNull(products.archivedAt)))
        .get();

      if (!productRow) {
        return null;
      }

      const variantRows = database
        .select()
        .from(productVariants)
        .where(
          and(
            eq(productVariants.productId, id),
            isNull(productVariants.archivedAt),
          ),
        )
        .all();

      return {
        id: productRow.id,
        name: productRow.name,
        type: parseProductType(productRow.type),
        salesPricePaise: productRow.salesPricePaise,
        costPricePaise: productRow.costPricePaise,
        notes: productRow.notes,
        createdAt: productRow.createdAt,
        updatedAt: productRow.updatedAt,
        archivedAt: productRow.archivedAt,
        variants: variantRows.map((v) => ({
          id: v.id,
          productId: v.productId,
          attributeName: v.attributeName,
          attributeValue: v.attributeValue,
          extraPricePaise: v.extraPricePaise,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
          archivedAt: v.archivedAt,
        })),
      };
    },

    async listProducts(
      limit: number,
      offset: number,
    ): Promise<{ items: ProductDetailRecord[]; total: number }> {
      const totalResult = database
        .select({ total: count() })
        .from(products)
        .where(isNull(products.archivedAt))
        .get();
      const total = totalResult?.total ?? 0;

      const productRows = database
        .select()
        .from(products)
        .where(isNull(products.archivedAt))
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset)
        .all();

      if (productRows.length === 0) {
        return { items: [], total };
      }

      const productIds = productRows.map((p) => p.id);
      const variantRows = database
        .select()
        .from(productVariants)
        .where(
          and(
            inArray(productVariants.productId, productIds),
            isNull(productVariants.archivedAt),
          ),
        )
        .all();

      const variantsByProductId = new Map<string, ProductVariantRecord[]>();
      for (const v of variantRows) {
        const existing = variantsByProductId.get(v.productId);
        const mapped: ProductVariantRecord = {
          id: v.id,
          productId: v.productId,
          attributeName: v.attributeName,
          attributeValue: v.attributeValue,
          extraPricePaise: v.extraPricePaise,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
          archivedAt: v.archivedAt,
        };
        if (existing) {
          existing.push(mapped);
        } else {
          variantsByProductId.set(v.productId, [mapped]);
        }
      }

      const items: ProductDetailRecord[] = productRows.map((p) => ({
        id: p.id,
        name: p.name,
        type: parseProductType(p.type),
        salesPricePaise: p.salesPricePaise,
        costPricePaise: p.costPricePaise,
        notes: p.notes,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        archivedAt: p.archivedAt,
        variants: variantsByProductId.get(p.id) ?? [],
      }));

      return { items, total };
    },

    async updateProduct(
      id: string,
      updateData: UpdateProductData,
      variants?: CreateVariantData[] | undefined,
    ): Promise<ProductDetailRecord | null> {
      const existing = database
        .select()
        .from(products)
        .where(and(eq(products.id, id), isNull(products.archivedAt)))
        .get();

      if (!existing) {
        return null;
      }

      database.transaction((tx) => {
        const updateValues: Record<string, unknown> = {
          updatedAt: updateData.updatedAt,
        };
        if (updateData.name !== undefined) {
          updateValues["name"] = updateData.name;
        }
        if (updateData.type !== undefined) {
          updateValues["type"] = updateData.type;
        }
        if (updateData.salesPricePaise !== undefined) {
          updateValues["salesPricePaise"] = updateData.salesPricePaise;
        }
        if (updateData.costPricePaise !== undefined) {
          updateValues["costPricePaise"] = updateData.costPricePaise;
        }
        if (updateData.notes !== undefined) {
          updateValues["notes"] = updateData.notes;
        }

        tx.update(products)
          .set(updateValues)
          .where(eq(products.id, id))
          .run();

        if (variants !== undefined) {
          tx.update(productVariants)
            .set({ archivedAt: updateData.updatedAt })
            .where(
              and(
                eq(productVariants.productId, id),
                isNull(productVariants.archivedAt),
              ),
            )
            .run();

          for (const variant of variants) {
            tx.insert(productVariants)
              .values({
                id: variant.id,
                productId: variant.productId,
                attributeName: variant.attributeName,
                attributeValue: variant.attributeValue,
                extraPricePaise: variant.extraPricePaise,
                createdAt: variant.createdAt,
                updatedAt: variant.updatedAt,
              })
              .run();
          }
        }
      });

      return this.findProductById(id);
    },

    async softDeleteProduct(id: string, nowMs: number): Promise<boolean> {
      const existing = database
        .select()
        .from(products)
        .where(and(eq(products.id, id), isNull(products.archivedAt)))
        .get();

      if (!existing) {
        return false;
      }

      database.transaction((tx) => {
        tx.update(products)
          .set({ archivedAt: nowMs })
          .where(eq(products.id, id))
          .run();
        tx.update(productVariants)
          .set({ archivedAt: nowMs })
          .where(
            and(
              eq(productVariants.productId, id),
              isNull(productVariants.archivedAt),
            ),
          )
          .run();
      });

      return true;
    },
  };
}

