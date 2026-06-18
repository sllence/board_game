import { pgTable, serial, varchar, integer, text, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 系统表 - 禁止删除
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户表
export const users = pgTable("users", {
  id: serial().primaryKey(),
  openid: varchar("openid", { length: 64 }),
  ttOpenid: varchar("tt_openid", { length: 64 }),
  nickname: varchar("nickname", { length: 32 }),
  avatarUrl: varchar("avatar_url", { length: 512 }),
  platform: varchar("platform", { length: 16 }),
  totalGames: integer("total_games").default(0),
  totalWins: integer("total_wins").default(0),
  totalTime: integer("total_time").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("users_openid_idx").on(table.openid),
  index("users_tt_openid_idx").on(table.ttOpenid),
]);

// 桌游表
export const boardGames = pgTable("board_games", {
  id: serial().primaryKey(),
  name: varchar("name", { length: 32 }).notNull(),
  type: varchar("type", { length: 16 }).notNull(),
  scene: varchar("scene", { length: 16 }),
  minPlayers: integer("min_players").notNull(),
  maxPlayers: integer("max_players").notNull(),
  duration: integer("duration").notNull(),
  minDuration: integer("min_duration"),
  maxDuration: integer("max_duration"),
  difficulty: varchar("difficulty", { length: 16 }).notNull(),
  iconKey: varchar("icon_key", { length: 32 }),
  iconBg: varchar("icon_bg", { length: 64 }),
  iconColor: varchar("icon_color", { length: 16 }),
  heroBg: varchar("hero_bg", { length: 64 }),
  imageUrl: varchar("image_url", { length: 512 }),
  intro: text("intro"),
  rules: text("rules"),
  tips: jsonb("tips"),
  scoringConfig: jsonb("scoring_config"),
  sortOrder: integer("sort_order").default(0),
  status: varchar("status", { length: 16 }).default("online"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("board_games_type_idx").on(table.type),
  index("board_games_difficulty_idx").on(table.difficulty),
  index("board_games_sort_order_idx").on(table.sortOrder),
]);

// 攻略表
export const guides = pgTable("guides", {
  id: serial().primaryKey(),
  gameId: integer("game_id").notNull().references(() => boardGames.id),
  title: varchar("title", { length: 64 }).notNull(),
  desc: varchar("desc", { length: 128 }),
  coverIcon: varchar("cover_icon", { length: 32 }),
  coverBg: varchar("cover_bg", { length: 64 }),
  steps: jsonb("steps"),
  tips: jsonb("tips"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("guides_game_id_idx").on(table.gameId),
]);

// 对局记录表
export const gameSessions = pgTable("game_sessions", {
  id: serial().primaryKey(),
  userId: integer("user_id"),
  gameId: integer("game_id").notNull().references(() => boardGames.id),
  sessionName: varchar("session_name", { length: 64 }),
  players: jsonb("players").notNull(),
  winner: varchar("winner", { length: 32 }),
  rounds: integer("rounds").default(0),
  duration: integer("duration").default(0),
  scoringSnapshot: jsonb("scoring_snapshot"),
  status: varchar("status", { length: 16 }).default("playing"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("game_sessions_user_id_idx").on(table.userId),
  index("game_sessions_game_id_idx").on(table.gameId),
  index("game_sessions_status_idx").on(table.status),
  index("game_sessions_created_at_idx").on(table.createdAt),
]);

// 收藏表（预留）
export const favorites = pgTable("favorites", {
  id: serial().primaryKey(),
  userId: integer("user_id").notNull(),
  gameId: integer("game_id").notNull().references(() => boardGames.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("favorites_user_id_idx").on(table.userId),
  index("favorites_game_id_idx").on(table.gameId),
]);

// 桌游规则表（多格式规则：Markdown / 图片）
export const gameRules = pgTable("game_rules", {
  id: serial().primaryKey(),
  gameId: integer("game_id").notNull().references(() => boardGames.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 128 }).notNull(),
  ruleType: varchar("rule_type", { length: 16 }).notNull().default('markdown'),
  content: text("content"),
  imageUrls: jsonb("image_urls").default([]),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("idx_game_rules_game_id").on(table.gameId),
  index("idx_game_rules_sort_order").on(table.sortOrder),
]);

// 用户反馈表
export const feedbacks = pgTable("feedbacks", {
  id: serial().primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: varchar("type", { length: 32 }).notNull(), // bug_report/new_game/new_tool/suggestion
  content: text("content").notNull(),
  images: jsonb("images").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("feedbacks_user_id_idx").on(table.userId),
  index("feedbacks_type_idx").on(table.type),
  index("feedbacks_created_at_idx").on(table.createdAt),
]);
