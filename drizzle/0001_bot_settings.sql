CREATE TABLE IF NOT EXISTS `bot_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`commands_enabled` integer NOT NULL DEFAULT true,
	`slogans` text NOT NULL DEFAULT '["vibe alert","type /play to start","music 24/7","spotify who?","the best music bot","spürst du die frequenzen?"]'
);
--> statement-breakpoint
INSERT OR IGNORE INTO `bot_settings` (`id`, `commands_enabled`, `slogans`) VALUES (1, 1, '["vibe alert","type /play to start","music 24/7","spotify who?","the best music bot","spürst du die frequenzen?"]');
