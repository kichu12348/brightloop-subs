CREATE TABLE `discounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`value` integer NOT NULL,
	`scope` text NOT NULL,
	`product_id` text,
	`min_quantity` integer DEFAULT 0 NOT NULL,
	`min_purchase_paise` integer DEFAULT 0 NOT NULL,
	`start_date` text,
	`end_date` text,
	`max_uses` integer,
	`times_used` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoice_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`description` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_paise` integer NOT NULL,
	`tax_rate_basis_points` integer DEFAULT 0 NOT NULL,
	`line_total_paise` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `invoice_lines_invoice_id_idx` ON `invoice_lines` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`status` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`due_date` text NOT NULL,
	`subtotal_paise` integer NOT NULL,
	`discount_paise` integer DEFAULT 0 NOT NULL,
	`tax_paise` integer DEFAULT 0 NOT NULL,
	`total_paise` integer NOT NULL,
	`amount_paid_paise` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `invoices_status_due_date_idx` ON `invoices` (`status`,`due_date`);--> statement-breakpoint
CREATE INDEX `invoices_customer_id_created_at_idx` ON `invoices` (`customer_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_subscription_id_period_start_unique` ON `invoices` (`subscription_id`,`period_start`);--> statement-breakpoint
CREATE INDEX `invoices_created_at_idx` ON `invoices` (`created_at`);--> statement-breakpoint
CREATE INDEX `invoices_subscription_id_idx` ON `invoices` (`subscription_id`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`method` text NOT NULL,
	`reference` text,
	`payment_date` text,
	`recorded_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payments_invoice_id_idx` ON `payments` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text,
	`name` text NOT NULL,
	`price_paise` integer NOT NULL,
	`billing_period` text NOT NULL,
	`min_quantity` integer DEFAULT 1 NOT NULL,
	`available_from` text,
	`available_to` text,
	`auto_close_on_end` integer DEFAULT false NOT NULL,
	`can_close_early` integer DEFAULT false NOT NULL,
	`can_pause` integer DEFAULT false NOT NULL,
	`can_renew` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`attribute_name` text NOT NULL,
	`attribute_value` text NOT NULL,
	`extra_price_paise` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`sales_price_paise` integer NOT NULL,
	`cost_price_paise` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer
);
--> statement-breakpoint
CREATE TABLE `quotation_template_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`tax_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `quotation_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tax_id`) REFERENCES `taxes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quotation_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`plan_id` text,
	`validity_days` integer DEFAULT 30 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `subscription_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price_paise` integer NOT NULL,
	`tax_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tax_id`) REFERENCES `taxes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `subscription_lines_subscription_id_idx` ON `subscription_lines` (`subscription_id`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`sub_number` text NOT NULL,
	`customer_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`status` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`next_billing_date` text,
	`discount_id` text,
	`payment_terms_days` integer DEFAULT 30 NOT NULL,
	`template_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`discount_id`) REFERENCES `discounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`template_id`) REFERENCES `quotation_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_sub_number_unique` ON `subscriptions` (`sub_number`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `subscriptions_next_billing_date_idx` ON `subscriptions` (`next_billing_date`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_next_billing_date_idx` ON `subscriptions` (`status`,`next_billing_date`);--> statement-breakpoint
CREATE INDEX `subscriptions_customer_id_idx` ON `subscriptions` (`customer_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_created_at_idx` ON `subscriptions` (`created_at`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_created_at_idx` ON `subscriptions` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `taxes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`rate_bps` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);