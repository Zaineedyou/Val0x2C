CREATE TABLE `files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`storageKey` text NOT NULL,
	`storageUrl` text NOT NULL,
	`mimeType` varchar(160) NOT NULL,
	`sizeBytes` int NOT NULL,
	`shareToken` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `files_id` PRIMARY KEY(`id`),
	CONSTRAINT `files_shareToken_unique` UNIQUE(`shareToken`)
);
