import { db, type AppDatabase } from "./db/client.ts";
import { systemClock, type Clock } from "./lib/clock.ts";
import { InMemoryMailer, type Mailer } from "./lib/mailer.ts";
import {
  createSqliteAuthRepository,
  createAuthService,
  type AuthRepository,
  type AuthService,
} from "./modules/auth/index.ts";
import {
  createSqliteUsersRepository,
  createUsersService,
  type UsersRepository,
  type UsersService,
} from "./modules/users/index.ts";
import {
  createSqliteProductsRepository,
  createProductsService,
  type ProductsRepository,
  type ProductsService,
} from "./modules/products/index.ts";
import {
  createSqlitePlansRepository,
  createPlansService,
  type PlansRepository,
  type PlansService,
} from "./modules/plans/index.ts";
import {
  createSqliteTaxesRepository,
  createTaxesService,
  type TaxesRepository,
  type TaxesService,
} from "./modules/taxes/index.ts";
import {
  createSqliteDiscountsRepository,
  createDiscountsService,
  type DiscountsRepository,
  type DiscountsService,
} from "./modules/discounts/index.ts";
import {
  createSqliteQuotationTemplatesRepository,
  createQuotationTemplatesService,
  type QuotationTemplatesRepository,
  type QuotationTemplatesService,
} from "./modules/quotationTemplates/index.ts";
import {
  createSqliteSubscriptionsRepository,
  createSubscriptionsService,
  type SubscriptionsRepository,
  type SubscriptionsService,
} from "./modules/subscriptions/index.ts";
import {
  createBillingService,
  type BillingService,
} from "./modules/billing/index.ts";
import {
  createSqliteInvoicesRepository,
  createInvoicesService,
  type InvoicesRepository,
  type InvoicesService,
} from "./modules/invoices/index.ts";
import {
  createSqliteDashboardRepository,
  createDashboardService,
  type DashboardRepository,
  type DashboardService,
} from "./modules/dashboard/index.ts";

export interface AppDependencies {
  db: AppDatabase;
  clock: Clock;
  mailer: Mailer;
}

export interface AppContainer extends AppDependencies {
  authRepository: AuthRepository;
  authService: AuthService;
  usersRepository: UsersRepository;
  usersService: UsersService;
  productsRepository: ProductsRepository;
  productsService: ProductsService;
  plansRepository: PlansRepository;
  plansService: PlansService;
  taxesRepository: TaxesRepository;
  taxesService: TaxesService;
  discountsRepository: DiscountsRepository;
  discountsService: DiscountsService;
  quotationTemplatesRepository: QuotationTemplatesRepository;
  quotationTemplatesService: QuotationTemplatesService;
  subscriptionsRepository: SubscriptionsRepository;
  subscriptionsService: SubscriptionsService;
  billingService: BillingService;
  invoicesRepository: InvoicesRepository;
  invoicesService: InvoicesService;
  dashboardRepository: DashboardRepository;
  dashboardService: DashboardService;
}

export function createContainer(
  overrides: Partial<AppDependencies> = {},
): AppContainer {
  const database = overrides.db ?? db;
  const clock = overrides.clock ?? systemClock;
  const mailer = overrides.mailer ?? new InMemoryMailer();

  const authRepository = createSqliteAuthRepository(database);
  const authService = createAuthService({
    repository: authRepository,
    clock,
    mailer,
  });

  const usersRepository = createSqliteUsersRepository(database);
  const usersService = createUsersService({
    repository: usersRepository,
    clock,
  });

  const productsRepository = createSqliteProductsRepository(database);
  const productsService = createProductsService({
    repository: productsRepository,
    clock,
  });

  const plansRepository = createSqlitePlansRepository(database);
  const plansService = createPlansService({
    repository: plansRepository,
    clock,
  });

  const taxesRepository = createSqliteTaxesRepository(database);
  const taxesService = createTaxesService({
    repository: taxesRepository,
    clock,
  });

  const discountsRepository = createSqliteDiscountsRepository(database);
  const discountsService = createDiscountsService({
    repository: discountsRepository,
    clock,
  });

  const quotationTemplatesRepository =
    createSqliteQuotationTemplatesRepository(database);
  const quotationTemplatesService = createQuotationTemplatesService({
    repository: quotationTemplatesRepository,
    clock,
  });

  const subscriptionsRepository =
    createSqliteSubscriptionsRepository(database);
  const subscriptionsService = createSubscriptionsService({
    repository: subscriptionsRepository,
    usersService,
    plansService,
    productsService,
    taxesService,
    discountsService,
    quotationTemplatesService,
    clock,
  });

  const billingService = createBillingService({
    db: database,
    clock,
  });

  const invoicesRepository = createSqliteInvoicesRepository(database);
  const invoicesService = createInvoicesService({
    repository: invoicesRepository,
    clock,
  });

  const dashboardRepository = createSqliteDashboardRepository(database);
  const dashboardService = createDashboardService({
    repository: dashboardRepository,
    clock,
  });

  return {
    db: database,
    clock,
    mailer,
    authRepository,
    authService,
    usersRepository,
    usersService,
    productsRepository,
    productsService,
    plansRepository,
    plansService,
    taxesRepository,
    taxesService,
    discountsRepository,
    discountsService,
    quotationTemplatesRepository,
    quotationTemplatesService,
    subscriptionsRepository,
    subscriptionsService,
    billingService,
    invoicesRepository,
    invoicesService,
    dashboardRepository,
    dashboardService,
  };
}
