import { Router } from "express";
import { db } from "@workspace/db";
import { botUsersTable, analysesTable } from "@workspace/db";
import { eq, desc, count, sql, and, gte } from "drizzle-orm";
import {
  GetBotStatsResponse,
  ListAnalysesQueryParams,
  ListAnalysesResponse,
  GetAnalysisParams,
  GetAnalysisResponse,
  ListBotUsersQueryParams,
  ListBotUsersResponse,
  GetRecentActivityResponse,
} from "@workspace/api-zod";

const router = Router();

router.get("/stats", async (req, res) => {
  const [usersCount] = await db.select({ count: count() }).from(botUsersTable);
  const [analysesCount] = await db.select({ count: count() }).from(analysesTable);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayCount] = await db
    .select({ count: count() })
    .from(analysesTable)
    .where(gte(analysesTable.createdAt, today));

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const activeUsers = await db
    .selectDistinct({ userId: analysesTable.userId })
    .from(analysesTable)
    .where(gte(analysesTable.createdAt, sevenDaysAgo));

  const result = GetBotStatsResponse.parse({
    totalUsers: usersCount?.count ?? 0,
    totalAnalyses: analysesCount?.count ?? 0,
    todayAnalyses: todayCount?.count ?? 0,
    activeUsers7d: activeUsers.length,
  });

  res.json(result);
});

router.get("/analyses", async (req, res) => {
  const query = ListAnalysesQueryParams.parse({
    limit: req.query.limit ? Number(req.query.limit) : 20,
    offset: req.query.offset ? Number(req.query.offset) : 0,
    userId: req.query.userId ? Number(req.query.userId) : undefined,
  });

  const conditions = query.userId
    ? [eq(analysesTable.userId, query.userId)]
    : [];

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: analysesTable.id,
        userId: analysesTable.userId,
        telegramId: sql<string>`${botUsersTable.telegramId}::text`,
        username: botUsersTable.username,
        firstName: botUsersTable.firstName,
        imageUrl: analysesTable.imageUrl,
        analysisText: analysesTable.analysisText,
        diseaseDetected: analysesTable.diseaseDetected,
        cropType: analysesTable.cropType,
        severity: analysesTable.severity,
        createdAt: sql<string>`${analysesTable.createdAt}::text`,
      })
      .from(analysesTable)
      .leftJoin(botUsersTable, eq(analysesTable.userId, botUsersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(analysesTable.createdAt))
      .limit(query.limit ?? 20)
      .offset(query.offset ?? 0),
    db
      .select({ total: count() })
      .from(analysesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined),
  ]);

  const result = ListAnalysesResponse.parse({ analyses: rows, total });
  res.json(result);
});

router.get("/analyses/:id", async (req, res) => {
  const { id } = GetAnalysisParams.parse({ id: Number(req.params.id) });

  const [row] = await db
    .select({
      id: analysesTable.id,
      userId: analysesTable.userId,
      telegramId: sql<string>`${botUsersTable.telegramId}::text`,
      username: botUsersTable.username,
      firstName: botUsersTable.firstName,
      imageUrl: analysesTable.imageUrl,
      analysisText: analysesTable.analysisText,
      diseaseDetected: analysesTable.diseaseDetected,
      cropType: analysesTable.cropType,
      severity: analysesTable.severity,
      createdAt: sql<string>`${analysesTable.createdAt}::text`,
    })
    .from(analysesTable)
    .leftJoin(botUsersTable, eq(analysesTable.userId, botUsersTable.id))
    .where(eq(analysesTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const result = GetAnalysisResponse.parse(row);
  res.json(result);
});

router.get("/users", async (req, res) => {
  const query = ListBotUsersQueryParams.parse({
    limit: req.query.limit ? Number(req.query.limit) : 50,
    offset: req.query.offset ? Number(req.query.offset) : 0,
  });

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: botUsersTable.id,
        telegramId: sql<string>`${botUsersTable.telegramId}::text`,
        username: botUsersTable.username,
        firstName: botUsersTable.firstName,
        lastName: botUsersTable.lastName,
        analysisCount: sql<number>`cast(count(${analysesTable.id}) as int)`,
        createdAt: sql<string>`${botUsersTable.createdAt}::text`,
      })
      .from(botUsersTable)
      .leftJoin(analysesTable, eq(botUsersTable.id, analysesTable.userId))
      .groupBy(botUsersTable.id)
      .orderBy(desc(botUsersTable.createdAt))
      .limit(query.limit ?? 50)
      .offset(query.offset ?? 0),
    db.select({ total: count() }).from(botUsersTable),
  ]);

  const result = ListBotUsersResponse.parse({ users: rows, total });
  res.json(result);
});

router.get("/recent-activity", async (req, res) => {
  const rows = await db
    .select({
      id: analysesTable.id,
      username: botUsersTable.username,
      firstName: botUsersTable.firstName,
      cropType: analysesTable.cropType,
      diseaseDetected: analysesTable.diseaseDetected,
      severity: analysesTable.severity,
      analysisText: analysesTable.analysisText,
      imageUrl: analysesTable.imageUrl,
      createdAt: sql<string>`${analysesTable.createdAt}::text`,
    })
    .from(analysesTable)
    .leftJoin(botUsersTable, eq(analysesTable.userId, botUsersTable.id))
    .orderBy(desc(analysesTable.createdAt))
    .limit(10);

  const result = GetRecentActivityResponse.parse({ items: rows });
  res.json(result);
});

export default router;
