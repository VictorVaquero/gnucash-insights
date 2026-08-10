CREATE TABLE `accountsClosure` (
	`bookId` text NOT NULL,
	`child` text,
	`parent` text,
	`depth` integer,
	FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`child`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`bookId` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`accountType` text NOT NULL,
	`parent` text,
	`commodity` text,
	`scu` integer,
	`description` text,
	FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commodity`) REFERENCES `commodities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`countAccount` integer NOT NULL,
	`countCommodity` integer NOT NULL,
	`countPrice` integer NOT NULL,
	`countSchedxaction` integer NOT NULL,
	`countTransaction` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `commodities` (
	`bookId` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`space` text NOT NULL,
	`name` text,
	`fraction` integer,
	`version` text,
	`code` text,
	FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fullTransactions` (
	`bookId` text NOT NULL,
	`transactionId` text NOT NULL,
	`accountId` text NOT NULL,
	`splitId` text PRIMARY KEY NOT NULL,
	`accountName` text NOT NULL,
	`datePosted` DateTime NOT NULL,
	`ymdPosted` text NOT NULL,
	`currencyId` text NOT NULL,
	`value` real NOT NULL,
	FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`currencyId`) REFERENCES `commodities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meta` (
	`countBook` integer,
	`parsedDate` text,
	`parsedVersion` text,
	`minDate` DateTime,
	`maxDate` DateTime
);
--> statement-breakpoint
CREATE TABLE `prices` (
	`bookId` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`priceType` text NOT NULL,
	`time` DateTime NOT NULL,
	`commodity` text NOT NULL,
	`currency` text NOT NULL,
	`value` real NOT NULL,
	FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commodity`) REFERENCES `commodities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`currency`) REFERENCES `commodities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `splits` (
	`transactionId` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`account` text NOT NULL,
	`value` real NOT NULL,
	`quantity` real NOT NULL,
	`isReconciled` text NOT NULL,
	`reconciledDate` DateTime NOT NULL,
	`action` text,
	`memo` text,
	FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `summary_monthly` (
	`date` text NOT NULL,
	`dateLabel` text NOT NULL,
	`accountId` text NOT NULL,
	`accountName` text PRIMARY KEY NOT NULL,
	`totalValue` real NOT NULL,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `summary_quarterly` (
	`date` text NOT NULL,
	`dateLabel` text NOT NULL,
	`accountId` text NOT NULL,
	`accountName` text PRIMARY KEY NOT NULL,
	`totalValue` real NOT NULL,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `summary_yearly` (
	`date` text NOT NULL,
	`dateLabel` text NOT NULL,
	`accountId` text NOT NULL,
	`accountName` text PRIMARY KEY NOT NULL,
	`totalValue` real NOT NULL,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `timetable` (
	`ymd` DateTime PRIMARY KEY NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`day` integer NOT NULL,
	`yearmonth` text NOT NULL,
	`monthName` text NOT NULL,
	`weekDayNum` integer,
	`weekDayName` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`bookId` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`dateEntered` DateTime NOT NULL,
	`datePosted` DateTime NOT NULL,
	`ymdPosted` DateTime NOT NULL,
	`currencyId` text NOT NULL,
	`description` text,
	`slDatePosted` text,
	`slFromSchedXaction` text,
	`slNotes` text,
	FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`currencyId`) REFERENCES `commodities`(`id`) ON UPDATE no action ON DELETE no action
);
