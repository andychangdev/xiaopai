CREATE TABLE `leave` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`staff_id` integer NOT NULL,
	`from_date` text NOT NULL,
	`to_date` text NOT NULL,
	`note` text,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `na_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_start` text NOT NULL,
	`staff_id` integer NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`week_start`) REFERENCES `rosters`(`week_start`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `na_notes_cell_unique` ON `na_notes` (`week_start`,`staff_id`,`date`);--> statement-breakpoint
CREATE TABLE `rosters` (
	`week_start` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`published_at` text,
	`week_note` text,
	`closed_days` text DEFAULT '[false,false,false,false,false,false,false]' NOT NULL,
	`snapshot` text
);
--> statement-breakpoint
CREATE TABLE `shift_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_start` text NOT NULL,
	`staff_id` integer NOT NULL,
	`date` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`note` text,
	FOREIGN KEY (`week_start`) REFERENCES `rosters`(`week_start`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `shifts_week_start_idx` ON `shifts` (`week_start`);--> statement-breakpoint
CREATE TABLE `staff` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`available` text NOT NULL,
	`sort_order` integer NOT NULL,
	`expected_hours` integer,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `trading_hours` (
	`weekday` integer PRIMARY KEY NOT NULL,
	`open` integer NOT NULL,
	`close` integer NOT NULL
);
