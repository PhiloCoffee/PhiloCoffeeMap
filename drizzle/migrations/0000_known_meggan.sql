CREATE TABLE "coffee_spots" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"notes" text,
	"philosophy_quote" text,
	"vibe" text,
	"rating" integer,
	"tags" jsonb,
	"photos" jsonb,
	"visited_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
