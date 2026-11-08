import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  document: text("document").notNull(),
  revision: integer("revision").notNull().default(0),
});
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  wallet: text("wallet"),
  challenge: text("challenge"),
  challengeExpiry: integer("challenge_expiry"),
  createdAt: integer("created_at").notNull(),
});
export const presence = sqliteTable("presence", {
  id: text("id").primaryKey(),
  room: text("room").notNull(),
  session: text("session").notNull(),
  seenAt: integer("seen_at").notNull(),
});

// Shared credit demo: the whole accounting document is committed with one CAS.
export const creditGame = sqliteTable("ctrl_game_v3", {
  id: text("id").primaryKey(),
  document: text("document").notNull(),
  revision: integer("revision").notNull().default(0),
});
