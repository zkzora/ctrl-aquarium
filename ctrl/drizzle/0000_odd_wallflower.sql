CREATE TABLE `presence` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`session` text NOT NULL,
	`seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`document` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`wallet` text,
	`challenge` text,
	`challenge_expiry` integer,
	`created_at` integer NOT NULL
);
