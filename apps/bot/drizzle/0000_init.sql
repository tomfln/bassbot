CREATE TABLE `activity_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` integer NOT NULL,
	`guild_id` text NOT NULL,
	`guild_name` text NOT NULL,
	`user_id` text NOT NULL,
	`user_name` text NOT NULL,
	`user_avatar` text DEFAULT '' NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `guild_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`channels` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guild_options_guild_id_unique` ON `guild_options` (`guild_id`);--> statement-breakpoint
CREATE TABLE `queue_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`queue` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `saved_queues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`queue` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_queues_guild_id_unique` ON `saved_queues` (`guild_id`);