import { pgTable, serial, text, doublePrecision, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const coffeeSpots = pgTable('coffee_spots', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  notes: text('notes'),
  philosophy_quote: text('philosophy_quote'),
  vibe: text('vibe'),
  rating: integer('rating'),
  tags: jsonb('tags').$type<string[]>(),
  photos: jsonb('photos').$type<string[]>(),
  visited_at: timestamp('visited_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type CoffeeSpotRow = typeof coffeeSpots.$inferSelect;
export type NewCoffeeSpot = typeof coffeeSpots.$inferInsert;
