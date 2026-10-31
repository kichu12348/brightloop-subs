import { describe, expect, it } from "bun:test";
import { buildApp } from "../app.ts";
import { createTestDb } from "../db/client.ts";
import {
  BillingPeriod,
  DiscountKind,
  DiscountScope,
  ProductType,
  Role,
} from "@brightloop/shared";

describe("Catalog Modules (Products, Plans, Taxes, Discounts, Quotation Templates)", () => {
  it("allows Admin to create Product with Odoo variant, Plan, Tax, Discount, and Quotation Template", async () => {
    const testDb = createTestDb();
    const app = await buildApp({ db: testDb });

    const adminToken = app.jwt.sign({
      id: "admin-1",
      email: "admin@brightloop.com",
      role: Role.Admin,
    });

    const createProductResponse = await app.inject({
      method: "POST",
      url: "/api/products",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: "Enterprise ERP",
        type: ProductType.Subscription,
        salesPricePaise: 120000,
        costPricePaise: 40000,
        notes: "Enterprise cloud tier",
        variants: [
          {
            attributeName: "Brand",
            attributeValue: "Odoo",
            extraPricePaise: 56000,
          },
        ],
      },
    });

    expect(createProductResponse.statusCode).toBe(201);
    const product = JSON.parse(createProductResponse.body) as {
      id: string;
      name: string;
      salesPricePaise: number;
      variants: Array<{
        id: string;
        attributeName: string;
        attributeValue: string;
        extraPricePaise: number;
      }>;
    };
    expect(product.id).toBeDefined();
    expect(product.name).toBe("Enterprise ERP");
    expect(product.salesPricePaise).toBe(120000);
    expect(product.variants).toHaveLength(1);
    const odooVariant = product.variants[0];
    if (!odooVariant) {
      throw new Error("Variant was not returned");
    }
    expect(odooVariant.attributeName).toBe("Brand");
    expect(odooVariant.attributeValue).toBe("Odoo");
    expect(odooVariant.extraPricePaise).toBe(56000);

    const createPlanResponse = await app.inject({
      method: "POST",
      url: "/api/plans",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: "Annual Plan",
        pricePaise: 120000,
        billingPeriod: BillingPeriod.Yearly,
        minQuantity: 1,
        autoCloseOnEnd: true,
        canCloseEarly: false,
        canPause: true,
        canRenew: true,
      },
    });

    expect(createPlanResponse.statusCode).toBe(201);
    const plan = JSON.parse(createPlanResponse.body) as {
      id: string;
      name: string;
      autoCloseOnEnd: boolean;
      canCloseEarly: boolean;
      canPause: boolean;
      canRenew: boolean;
    };
    expect(plan.id).toBeDefined();
    expect(plan.autoCloseOnEnd).toBe(true);
    expect(plan.canCloseEarly).toBe(false);
    expect(plan.canPause).toBe(true);
    expect(plan.canRenew).toBe(true);

    const createTaxResponse = await app.inject({
      method: "POST",
      url: "/api/taxes",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: "GST 18%",
        rateBps: 1800,
        isActive: true,
      },
    });

    expect(createTaxResponse.statusCode).toBe(201);
    const tax = JSON.parse(createTaxResponse.body) as {
      id: string;
      name: string;
      rateBps: number;
      isActive: boolean;
    };
    expect(tax.id).toBeDefined();
    expect(tax.rateBps).toBe(1800);
    expect(tax.isActive).toBe(true);

    const createDiscountResponse = await app.inject({
      method: "POST",
      url: "/api/discounts",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: "Launch Discount",
        kind: DiscountKind.Percentage,
        value: 1000,
        scope: DiscountScope.Subscription,
        maxUses: 50,
      },
    });

    expect(createDiscountResponse.statusCode).toBe(201);
    const discount = JSON.parse(createDiscountResponse.body) as {
      id: string;
      name: string;
      value: number;
      timesUsed: number;
    };
    expect(discount.id).toBeDefined();
    expect(discount.name).toBe("Launch Discount");
    expect(discount.timesUsed).toBe(0);

    const missingProductScopeResponse = await app.inject({
      method: "POST",
      url: "/api/discounts",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: "Invalid Product Discount",
        kind: DiscountKind.Fixed,
        value: 500,
        scope: DiscountScope.Product,
      },
    });
    expect(missingProductScopeResponse.statusCode).toBe(422);

    const createTemplateResponse = await app.inject({
      method: "POST",
      url: "/api/quotation-templates",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: "Standard Quotation Template",
        planId: plan.id,
        validityDays: 30,
        lines: [
          {
            productId: product.id,
            variantId: odooVariant.id,
            quantity: 2,
            taxId: tax.id,
          },
        ],
      },
    });

    expect(createTemplateResponse.statusCode).toBe(201);
    const template = JSON.parse(createTemplateResponse.body) as {
      id: string;
      name: string;
      lines: Array<{
        productId: string;
        variantId: string | null;
        quantity: number;
        taxId: string | null;
      }>;
    };
    expect(template.id).toBeDefined();
    expect(template.lines).toHaveLength(1);
    const line = template.lines[0];
    if (!line) {
      throw new Error("Line missing");
    }
    expect(line.productId).toBe(product.id);
    expect(line.variantId).toBe(odooVariant.id);
    expect(line.quantity).toBe(2);
    expect(line.taxId).toBe(tax.id);

    await app.close();
  });

  it("enforces role guards: Staff and Customer receive 403 when creating or editing Products, Plans, Taxes, or Discounts", async () => {
    const testDb = createTestDb();
    const app = await buildApp({ db: testDb });

    const adminToken = app.jwt.sign({
      id: "admin-1",
      email: "admin@brightloop.com",
      role: Role.Admin,
    });
    const staffToken = app.jwt.sign({
      id: "staff-1",
      email: "staff@brightloop.com",
      role: Role.Staff,
    });
    const customerToken = app.jwt.sign({
      id: "customer-1",
      email: "cust@brightloop.com",
      role: Role.Customer,
    });

    const initProduct = await app.inject({
      method: "POST",
      url: "/api/products",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Base Product",
        type: ProductType.Service,
        salesPricePaise: 5000,
        costPricePaise: 2000,
        variants: [],
      },
    });
    const product = JSON.parse(initProduct.body) as { id: string };

    const initPlan = await app.inject({
      method: "POST",
      url: "/api/plans",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Base Plan",
        pricePaise: 5000,
        billingPeriod: BillingPeriod.Monthly,
      },
    });
    const plan = JSON.parse(initPlan.body) as { id: string };

    const initTax = await app.inject({
      method: "POST",
      url: "/api/taxes",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "VAT 5%",
        rateBps: 500,
      },
    });
    const tax = JSON.parse(initTax.body) as { id: string };

    const initDiscount = await app.inject({
      method: "POST",
      url: "/api/discounts",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Base Discount",
        kind: DiscountKind.Fixed,
        value: 1000,
        scope: DiscountScope.Subscription,
      },
    });
    const discount = JSON.parse(initDiscount.body) as { id: string };

    for (const token of [staffToken, customerToken]) {
      const createProduct = await app.inject({
        method: "POST",
        url: "/api/products",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          name: "Forbidden Product",
          type: ProductType.Service,
          salesPricePaise: 1000,
          costPricePaise: 500,
          variants: [],
        },
      });
      expect(createProduct.statusCode).toBe(403);

      const updateProduct = await app.inject({
        method: "PATCH",
        url: `/api/products/${product.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "Hacked" },
      });
      expect(updateProduct.statusCode).toBe(403);

      const deleteProduct = await app.inject({
        method: "DELETE",
        url: `/api/products/${product.id}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(deleteProduct.statusCode).toBe(403);

      const createPlan = await app.inject({
        method: "POST",
        url: "/api/plans",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          name: "Forbidden Plan",
          pricePaise: 1000,
          billingPeriod: BillingPeriod.Daily,
        },
      });
      expect(createPlan.statusCode).toBe(403);

      const updatePlan = await app.inject({
        method: "PATCH",
        url: `/api/plans/${plan.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "Hacked Plan" },
      });
      expect(updatePlan.statusCode).toBe(403);

      const deletePlan = await app.inject({
        method: "DELETE",
        url: `/api/plans/${plan.id}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(deletePlan.statusCode).toBe(403);

      const createTax = await app.inject({
        method: "POST",
        url: "/api/taxes",
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "Forbidden Tax", rateBps: 200 },
      });
      expect(createTax.statusCode).toBe(403);

      const updateTax = await app.inject({
        method: "PATCH",
        url: `/api/taxes/${tax.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "Hacked Tax" },
      });
      expect(updateTax.statusCode).toBe(403);

      const createDiscount = await app.inject({
        method: "POST",
        url: "/api/discounts",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          name: "Forbidden Discount",
          kind: DiscountKind.Fixed,
          value: 100,
          scope: DiscountScope.Subscription,
        },
      });
      expect(createDiscount.statusCode).toBe(403);

      const updateDiscount = await app.inject({
        method: "PATCH",
        url: `/api/discounts/${discount.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "Hacked Discount" },
      });
      expect(updateDiscount.statusCode).toBe(403);
    }

    const customerDiscountList = await app.inject({
      method: "GET",
      url: "/api/discounts",
      headers: { authorization: `Bearer ${customerToken}` },
    });
    expect(customerDiscountList.statusCode).toBe(403);

    const staffDiscountList = await app.inject({
      method: "GET",
      url: "/api/discounts",
      headers: { authorization: `Bearer ${staffToken}` },
    });
    expect(staffDiscountList.statusCode).toBe(200);

    const customerQuotationList = await app.inject({
      method: "GET",
      url: "/api/quotation-templates",
      headers: { authorization: `Bearer ${customerToken}` },
    });
    expect(customerQuotationList.statusCode).toBe(403);

    const staffQuotationList = await app.inject({
      method: "GET",
      url: "/api/quotation-templates",
      headers: { authorization: `Bearer ${staffToken}` },
    });
    expect(staffQuotationList.statusCode).toBe(200);

    await app.close();
  });
});

